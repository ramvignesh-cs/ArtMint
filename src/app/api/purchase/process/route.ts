import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, getServerUserProfile, addServerTransaction, addUserAsset } from "@/lib/firebase-admin";
import { getCheckoutSession } from "@/lib/stripe";
import { addAssetOwner } from "@/lib/contentstack-am2";
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
    const stripePaymentId = session.payment_intent as string;

    log.info(`[Manual Process] Processing purchase`, { artworkId, userId, amount });

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
      return NextResponse.json({
        success: true,
        message: "Purchase already processed",
        transactionId: existingTransaction.id,
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

      // 2. Update Contentstack Asset Management 2.0 asset metadata with new owner
      const purchaseDate = new Date().toISOString();

      await addAssetOwner(artworkId, {
        user_id: userId,
        user_name: (userProfile as any)?.displayName || "Anonymous",
        purchase_date: purchaseDate,
        transaction_id: transactionId,
      });

      log.info(`[Manual Process] Ownership updated for artwork`, { artworkId });

      // 3. Add asset to user's collection in Firestore
      await addUserAsset(userId, artworkId, {
        transactionId,
        purchaseDate,
        price: amount,
        currency: "USD",
      });

      log.info(`[Manual Process] Asset added to user collection`, { artworkId });

      // 4. Revalidate artwork page to show updated ownership
      revalidatePath(`/art/${artworkId}`);

      return NextResponse.json({
        success: true,
        message: "Purchase processed successfully",
        transactionId,
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

