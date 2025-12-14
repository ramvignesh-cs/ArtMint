import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { verifyWebhookSignature, getCheckoutSession } from "@/lib/stripe";
import { addServerTransaction, getServerUserProfile, addUserAsset } from "@/lib/firebase-admin";
import { addAssetOwner } from "@/lib/contentstack-am2";
import { createTransactionId } from "@/lib/wallet";
import { revalidatePath } from "next/cache";
import { log } from "@/lib/logger";

// Configure route for App Router - prevent timeout and ensure raw body handling
export const runtime = "nodejs";
export const maxDuration = 30; // 30 seconds max duration

/**
 * POST /api/purchase/webhook
 * Handle Stripe webhook events for purchase completion
 */
export async function POST(request: NextRequest) {
  log.info("[Webhook] Received webhook request");
  
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    log.debug("[Webhook] Signature present", { hasSignature: !!signature, bodyLength: body.length });

    if (!signature) {
      log.error("[Webhook] No signature provided in headers");
      return NextResponse.json(
        { error: "No signature provided" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event;
    try {
      log.debug("[Webhook] Verifying signature...");
      event = verifyWebhookSignature(body, signature);
      log.info("[Webhook] Signature verified", { eventType: event.type });
    } catch (err: any) {
      log.error("[Webhook] Signature verification failed", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Handle checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      log.info("[Webhook] Processing checkout.session.completed event");
      const session = event.data.object;

      // Extract metadata from session
      const { artworkId, userId, walletId } = session.metadata || {};

      if (!artworkId || !userId || !walletId) {
        log.error("Missing metadata in webhook", undefined, { metadata: session.metadata });
        return NextResponse.json(
          { error: "Missing required metadata" },
          { status: 400 }
        );
      }

      const amount = (session.amount_total || 0) / 100; // Convert from cents
      const stripePaymentId = session.payment_intent as string;

      log.info(`Processing purchase`, { artworkId, userId, amount });

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

        log.info(`Transaction added to wallet`, { transactionId, walletId });

        // 2. Update Contentstack Asset Management 2.0 asset metadata with new owner
        const userProfile = await getServerUserProfile(userId);
        const purchaseDate = new Date().toISOString();

        await addAssetOwner(artworkId, {
          user_id: userId,
          user_name: (userProfile as any)?.displayName || "Anonymous",
          purchase_date: purchaseDate,
          transaction_id: transactionId,
        });

        log.info(`Ownership updated for artwork`, { artworkId, userId });

        // 3. Add asset to user's collection in Firestore
        await addUserAsset(userId, artworkId, {
          transactionId,
          purchaseDate,
          price: amount,
          currency: "USD", // TODO: Get from artwork metadata if needed
        });

        log.info(`Asset added to user collection`, { artworkId, userId });

        // 4. Revalidate artwork page to show updated ownership
        revalidatePath(`/art/${artworkId}`);

        return NextResponse.json({
          success: true,
          message: "Purchase processed successfully",
          transactionId,
        });
      } catch (processingError: any) {
        log.error("Error processing purchase", processingError, {
          artworkId,
          userId,
          walletId,
          code: processingError.code,
        });
        // In production, you would want to:
        // 1. Log this to a monitoring service
        // 2. Queue for retry
        // 3. Send alert to support team
        return NextResponse.json(
          { 
            error: "Error processing purchase",
            details: processingError.message,
          },
          { status: 500 }
        );
      }
    }

    // Handle payment_intent.payment_failed event
    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object;
      log.warn(`Payment failed`, { paymentIntentId: paymentIntent.id });
      // Could implement notification to user here
    }

    // Return 200 for any event we don't handle
    return NextResponse.json({ received: true });
  } catch (error: any) {
    log.error("Webhook error", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// App Router automatically handles raw body when using request.text()
// No need for config export in App Router

