import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, getServerUserProfile, createOffer, getAssetOffers } from "@/lib/firebase-admin";
import { getAssetFromCDA } from "@/lib/contentstack-am2";
import { log } from "@/lib/logger";
import { z } from "zod";

const offerSchema = z.object({
  amount: z.number().positive("Amount must be positive").max(1000000, "Amount exceeds maximum"),
  currency: z.string().min(1, "Currency is required").default("USD"),
  message: z.string().optional(),
});

/**
 * POST /api/assets/[assetUid]/offers
 * Create an offer for an asset
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assetUid: string }> }
) {
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

    const userId = decodedToken.uid;
    const { assetUid } = await params;

    if (!assetUid) {
      return NextResponse.json({ error: "Asset UID is required" }, { status: 400 });
    }

    // Get asset to verify it's available for offers (must be sold)
    const asset = await getAssetFromCDA(assetUid);
    const artMetadata = asset.custom_metadata?.art_metadata;
    
    // Check if asset is sold (offers can only be made on sold artworks)
    if (artMetadata?.status !== "sold") {
      return NextResponse.json(
        { error: "Offers can only be made on sold artworks." },
        { status: 400 }
      );
    }
    
    // Check if there's already an accepted offer
    // if (artMetadata?.accepted_offer?.buyer_id) {
    //   return NextResponse.json(
    //     { error: "This artwork already has an accepted offer." },
    //     { status: 400 }
    //   );
    // }
    
    // Check if user is the current owner (can't make offer on own artwork)
    const isCurrentOwner = artMetadata?.current_owner?.user_id === userId;
    if (isCurrentOwner) {
      return NextResponse.json(
        { error: "You cannot make an offer on your own artwork" },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = offerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid offer data", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { amount, currency, message } = validation.data;

    // Get user profile for name
    const userProfile = await getServerUserProfile(userId);
    if (!userProfile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Create offer
    const offer = await createOffer(assetUid, {
      buyerId: userId,
      buyerName: (userProfile as any)?.displayName || "Anonymous",
      amount,
      currency,
      message: message || "",
    });

    log.info(`[Create Offer] Offer created`, { offerId: offer.id, assetUid, buyerId: userId });

    return NextResponse.json({
      success: true,
      notice: "Offer submitted successfully",
      offer: {
        id: offer.id,
        assetUid: offer.assetUid,
        buyerId: offer.buyerId,
        buyerName: offer.buyerName,
        amount: offer.amount,
        currency: offer.currency,
        message: offer.message,
        status: offer.status,
        createdAt: offer.createdAt,
      },
    });
  } catch (error: any) {
    log.error("Create offer error", error);
    
    if (error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: error.message || "Failed to create offer" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/assets/[assetUid]/offers
 * Get all pending offers for an asset (only accessible by current owner)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetUid: string }> }
) {
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

    const userId = decodedToken.uid;
    const { assetUid } = await params;

    if (!assetUid) {
      return NextResponse.json({ error: "Asset UID is required" }, { status: 400 });
    }

    // Get asset to verify ownership
    const asset = await getAssetFromCDA(assetUid);
    const artMetadata = asset.custom_metadata?.art_metadata;
    
    // Check if user is the current owner
    const isCurrentOwner = artMetadata?.current_owner?.user_id === userId;
    if (!isCurrentOwner) {
      return NextResponse.json(
        { error: "Only the current owner can view offers" },
        { status: 403 }
      );
    }

    // Get offers
    const offers = await getAssetOffers(assetUid);

    return NextResponse.json({
      success: true,
      offers: offers.map((offer: any) => {
        // Convert Firestore Timestamp to ISO string if needed
        let createdAt: string;
        if (offer.createdAt?.toDate) {
          createdAt = offer.createdAt.toDate().toISOString();
        } else if (offer.createdAt?.seconds) {
          createdAt = new Date(offer.createdAt.seconds * 1000).toISOString();
        } else if (offer.createdAt) {
          createdAt = typeof offer.createdAt === "string" 
            ? offer.createdAt 
            : new Date(offer.createdAt).toISOString();
        } else {
          createdAt = new Date().toISOString();
        }

        return {
          id: offer.id,
          assetUid: offer.assetUid,
          buyerId: offer.buyerId,
          buyerName: offer.buyerName,
          amount: offer.amount,
          currency: offer.currency,
          message: offer.message,
          status: offer.status,
          createdAt,
        };
      }),
    });
  } catch (error: any) {
    log.error("Get offers error", error);
    
    if (error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: error.message || "Failed to get offers" },
      { status: 500 }
    );
  }
}

