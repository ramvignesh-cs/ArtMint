import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, getServerUserProfile, addServerTransaction, addUserAsset, removeUserAsset } from "@/lib/firebase-admin";
import { getCheckoutSession } from "@/lib/stripe";
import { addAssetOwner, triggerContentstackAutomation, getAssetUsingAMV2API } from "@/lib/contentstack-am2";
import { createTransactionId } from "@/lib/wallet";
import { revalidatePath } from "next/cache";
import { log } from "@/lib/logger";

/**
 * POST /api/purchase/process
 * Manually process a purchase after Stripe checkout (fallback for local development)
 * This is called from the success page if webhook hasn't processed the purchase yet
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await verifyIdToken(token);

    if (!decodedToken) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    log.info(`[Manual Process] Processing session`, { sessionId });

    // Get checkout session from Stripe
    const session = await getCheckoutSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: "Checkout session not found" },
        { status: 404 }
      );
    }

    // Check if payment was successful
    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 400 }
      );
    }

    // Extract metadata from session
    const { artworkId, userId, walletId } = session.metadata || {};

    if (!artworkId || !userId || !walletId) {
      log.error("[Manual Process] Missing metadata", undefined, { metadata: session.metadata });
      return NextResponse.json(
        { error: "Missing required metadata in checkout session" },
        { status: 400 }
      );
    }

    // Verify the user making the request is the same as the one who purchased
    if (decodedToken.uid !== userId) {
      return NextResponse.json(
        { error: "Unauthorized to process this purchase" },
        { status: 403 }
      );
    }

    const amount = (session.amount_total || 0) / 100; // Convert from cents
    // payment_intent might be expanded (object) or just an ID (string)
    const stripePaymentId = typeof session.payment_intent === "string" 
      ? session.payment_intent 
      : (session.payment_intent as any)?.id || session.id;

    log.info(`[Manual Process] Processing purchase`, { artworkId, userId, amount });

    // Early check: Verify if artwork is already owned by this user (idempotency check)
    const currentAsset = await getAssetUsingAMV2API(artworkId);
    const currentOwner = currentAsset.custom_metadata?.art_metadata?.current_owner;
    
    // If user already owns this artwork, purchase was already processed
    if (currentOwner?.user_id === userId) {
      log.info(`[Manual Process] User already owns artwork - checking for transaction`, { artworkId, userId });
      
      // Get wallet to find the transaction ID
      const userProfile = await getServerUserProfile(userId);
      if (userProfile && (userProfile as any).walletId) {
        const { getServerWallet } = await import("@/lib/firebase-admin");
        const wallet = await getServerWallet(walletId);
        const walletData = wallet as any;
        const existingTransaction = walletData?.transactions?.find(
          (t: any) => t.reference?.assetUid === artworkId && t.reference?.stripePaymentId === stripePaymentId
        );
        
        if (existingTransaction) {
          log.info(`[Manual Process] Purchase already processed - user owns artwork`, { 
            transactionId: existingTransaction.id,
            artworkId 
          });
          
          const existingPaymentId = typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent as any)?.id || session.id;
          
          return NextResponse.json({
            success: true,
            message: "Purchase already processed",
            transactionId: existingTransaction.id,
            gatewayPaymentId: existingPaymentId || sessionId,
          });
        }
      }
    }

    // Check if already processed (check if transaction exists)
    const userProfile = await getServerUserProfile(userId);
    if (!userProfile || !(userProfile as any).walletId) {
      return NextResponse.json(
        { error: "User wallet not found" },
        { status: 400 }
      );
    }

    // Get wallet to check if transaction already exists
    const { getServerWallet } = await import("@/lib/firebase-admin");
    const wallet = await getServerWallet(walletId);
    
    // Check if this purchase was already processed
    const walletData = wallet as any;
    const existingTransaction = walletData?.transactions?.find(
      (t: any) => t.reference?.stripePaymentId === stripePaymentId
    );

    if (existingTransaction) {
      log.info(`[Manual Process] Purchase already processed`, { transactionId: existingTransaction.id });
      // Extract payment intent ID (might be expanded object or string)
      const existingPaymentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent as any)?.id || session.id;
      
      return NextResponse.json({
        success: true,
        message: "Purchase already processed",
        transactionId: existingTransaction.id,
        gatewayPaymentId: existingPaymentId || sessionId,
      });
    }

    try {
      // 1. Add transaction to wallet ledger (immutable append)
      const transactionId = createTransactionId();

      await addServerTransaction(walletId, {
        id: transactionId,
        type: "DEBIT",
        amount,
        reference: {
          assetUid: artworkId,
          stripePaymentId,
          description: `Artwork purchase: ${artworkId}`,
        },
      });

      log.info(`[Manual Process] Transaction added to wallet`, { transactionId });

      // 2. Get current asset to find previous owner (re-fetch to ensure we have latest state)
      const currentAssetForOwner = await getAssetUsingAMV2API(artworkId);
      const currentOwnerForCheck = currentAssetForOwner.custom_metadata?.art_metadata?.current_owner;
      const previousOwnerId = currentOwnerForCheck?.user_id || null;
      
      // Double-check: If user already owns it now, another process might have completed it
      if (currentOwnerForCheck?.user_id === userId && previousOwnerId === userId) {
        log.warn(`[Manual Process] Race condition detected - user already owns artwork, skipping processing`, {
          artworkId,
          userId,
          transactionId,
        });
        
        // Still return success with the transaction we created
        const finalPaymentId = typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent as any)?.id || session.id;
        
        return NextResponse.json({
          success: true,
          message: "Purchase already processed (race condition handled)",
          transactionId,
          gatewayPaymentId: finalPaymentId || sessionId,
        });
      }

      // 3. Update Contentstack Asset Management 2.0 asset metadata with new owner
      const purchaseDate = new Date().toISOString();

      await addAssetOwner(artworkId, {
        user_id: userId,
        user_name: (userProfile as any)?.displayName || "Anonymous",
        purchase_date: purchaseDate,
        transaction_id: transactionId,
      });

      // Clear accepted offer in Firebase if purchase was from an accepted offer
      const { getAcceptedOffer } = await import("@/lib/firebase-admin");
      const acceptedOffer: any = await getAcceptedOffer(artworkId, userId);
      if (acceptedOffer && acceptedOffer.buyerId === userId) {
        // The offer is already marked as accepted, purchase completes the transaction
        // We don't need to do anything here as the ownership change is handled by addAssetOwner
      }

      log.info(`[Manual Process] Ownership updated for artwork`, { artworkId });

      // Final check before triggering automation: Verify ownership was actually updated
      // This prevents duplicate automation triggers if multiple requests processed simultaneously
      const verifyAsset = await getAssetUsingAMV2API(artworkId);
      const verifyOwner = verifyAsset.custom_metadata?.art_metadata?.current_owner;
      
      // Only trigger automation if this user is now the owner (prevents duplicate triggers)
      if (verifyOwner?.user_id === userId && verifyOwner?.transaction_id === transactionId) {
        // Trigger Contentstack Automation API to publish latest content to CDN
        log.info(`[Manual Process] Triggering Contentstack automation`, { artworkId, transactionId });
        triggerContentstackAutomation(artworkId);
      } else {
        log.warn(`[Manual Process] Skipping automation trigger - ownership mismatch or duplicate processing`, {
          artworkId,
          transactionId,
          expectedOwner: userId,
          actualOwner: verifyOwner?.user_id,
          actualTransactionId: verifyOwner?.transaction_id,
        });
      }

      // 4. Remove asset from previous owner's collection (if exists and different from new owner)
      if (previousOwnerId && previousOwnerId !== userId) {
        await removeUserAsset(previousOwnerId, artworkId);
        log.info(`[Manual Process] Removed asset from previous owner's collection`, { 
          artworkId, 
          previousOwnerId 
        });
      }

      // 5. Add asset to new owner's collection in Firestore
      await addUserAsset(userId, artworkId, {
        transactionId,
        purchaseDate,
        price: amount,
        currency: "USD",
      });

      log.info(`[Manual Process] Asset added to user collection`, { artworkId });

      // 4. Revalidate artwork page to show updated ownership
      revalidatePath(`/art/${artworkId}`);

      // Extract payment intent ID (might be expanded object or string)
      const finalPaymentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent as any)?.id || session.id;
      
      return NextResponse.json({
        success: true,
        message: "Purchase processed successfully",
        transactionId,
        gatewayPaymentId: finalPaymentId || sessionId,
      });
    } catch (processingError: any) {
      log.error("[Manual Process] Error processing purchase", processingError, {
        artworkId,
        userId,
        walletId,
        code: processingError.code,
      });
      return NextResponse.json(
        { 
          error: "Error processing purchase",
          details: processingError.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    log.error("[Manual Process] Error", error);
    return NextResponse.json(
      { error: error.message || "Failed to process purchase" },
      { status: 500 }
    );
  }
}

