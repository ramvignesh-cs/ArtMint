import Stripe from "stripe";
import { log } from "@/lib/logger";

/**
 * Stripe server-side client
 * Used for:
 * - Creating checkout sessions
 * - Processing webhooks
 * - Managing payments
 */

if (!process.env.STRIPE_SECRET_KEY) {
  log.warn("STRIPE_SECRET_KEY is not set. Stripe functionality will be limited.");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
  typescript: true,
});

/**
 * Create a checkout session for artwork purchase
 */
export async function createCheckoutSession({
  artworkId,
  artworkTitle,
  price,
  imageUrl,
  userId,
  walletId,
  successUrl,
  cancelUrl,
}: {
  artworkId: string;
  artworkTitle: string;
  price: number;
  imageUrl?: string;
  userId: string;
  walletId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: [
      "card",
      // "link" is automatically available in Stripe Checkout
      // Apple Pay and Google Pay are automatically enabled if:
      // 1. Domain is verified in Stripe Dashboard
      // 2. Using HTTPS (required for production)
      // 3. Payment methods are enabled in Stripe Dashboard
    ],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: artworkTitle,
            description: `Digital artwork purchase - ${artworkTitle}`,
            images: imageUrl ? [imageUrl] : [],
          },
          unit_amount: Math.round(price * 100), // Stripe uses cents
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      artworkId,
      userId,
      walletId,
      type: "artwork_purchase",
    },
    // Enable billing address collection for verification
    billing_address_collection: "required",
  });

  return session;
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Retrieve payment intent details
 */
export async function getPaymentIntent(paymentIntentId: string) {
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

/**
 * Retrieve checkout session details
 */
export async function getCheckoutSession(sessionId: string) {
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"],
  });
}

