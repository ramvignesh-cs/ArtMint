import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, getServerUserProfile, getServerWallet, getAcceptedOffer } from "@/lib/firebase-admin";
import { getAssetFromCDA } from "@/lib/contentstack-am2";
import { createCheckoutSession } from "@/lib/stripe";
import { createCheckoutSchema } from "@/lib/validations";
import { log } from "@/lib/logger";

// Configure route for App Router
export const runtime = "nodejs";
export const maxDuration = 30; // 30 seconds max duration

/**
 * POST /api/purchase/checkout
 * Create a Stripe checkout session for artwork purchase
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

    // Parse and validate request body
    const body = await request.json();
    const validation = createCheckoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { artworkId } = validation.data;

    // Get user profile
    const profile = await getServerUserProfile(decodedToken.uid);

    if (!((profile as any)?.walletId)) {
      return NextResponse.json(
        { error: "No wallet found. Please complete account setup." },
        { status: 400 }
      );
    }

    // Get artwork details from Contentstack Asset Management 2.0
    const asset = await getAssetFromCDA(artworkId);

    if (!asset) {
      return NextResponse.json(
        { error: "Artwork not found" },
        { status: 404 }
      );
    }

    const artMetadata = asset.custom_metadata?.art_metadata;

    if (!artMetadata?.price || artMetadata.price === null) {
      return NextResponse.json(
        { error: "Artwork is not for sale" },
        { status: 400 }
      );
    }

    // Check if artwork is available for purchase
    // It can be: "sale", "resale", or "sold" with an accepted offer for this buyer
    const acceptedOffer = await getAcceptedOffer(artworkId, decodedToken.uid);
    const hasAcceptedOffer = acceptedOffer && acceptedOffer.buyerId === decodedToken.uid;
    const isAvailableForSale = artMetadata.status === "sale" || artMetadata.status === "resale";
    
    if (!isAvailableForSale && !hasAcceptedOffer) {
      return NextResponse.json(
        { error: "This artwork is not available for purchase" },
        { status: 400 }
      );
    }
    
    // If there's an accepted offer, use the offer price
    const purchasePrice = hasAcceptedOffer 
      ? (acceptedOffer.amount || artMetadata.price)
      : artMetadata.price;

    // Check if user is the current owner
    const isCurrentOwner = artMetadata.current_owner?.user_id === decodedToken.uid;

    if (isCurrentOwner) {
      return NextResponse.json(
        { error: "You already own this artwork" },
        { status: 400 }
      );
    }

    // Cannot purchase your own artwork
    if (artMetadata.artist_uid === decodedToken.uid) {
      return NextResponse.json(
        { error: "Cannot purchase your own artwork" },
        { status: 400 }
      );
    }

    // Build success and cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const successUrl = `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/art/${artworkId}`;

    // Create Stripe checkout session
    const session = await createCheckoutSession({
      artworkId,
      artworkTitle: asset.title,
      price: purchasePrice as number, // Use offer price if accepted offer exists
      imageUrl: asset.url,
      userId: decodedToken.uid,
      walletId: (profile as any).walletId,
      successUrl,
      cancelUrl,
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    log.error("Checkout error", error);
    
    // Provide more specific error messages
    if (error.message) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create checkout session. Please try again." },
      { status: 500 }
    );
  }
}

