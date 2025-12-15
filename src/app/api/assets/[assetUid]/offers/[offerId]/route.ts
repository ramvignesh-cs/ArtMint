import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, updateOfferStatus } from "@/lib/firebase-admin";
import { getAssetFromCDA } from "@/lib/contentstack-am2";
import { revalidatePath } from "next/cache";
import { log } from "@/lib/logger";
import { z } from "zod";

const updateOfferSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
});

/**
 * PUT /api/assets/[assetUid]/offers/[offerId]
 * Accept or reject an offer (only accessible by current owner)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ assetUid: string; offerId: string }> }
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
    const { assetUid, offerId } = await params;

    if (!assetUid || !offerId) {
      return NextResponse.json(
        { error: "Asset UID and Offer ID are required" },
        { status: 400 }
      );
    }

    // Get asset to verify ownership
    const asset = await getAssetFromCDA(assetUid);
    const artMetadata = asset.custom_metadata?.art_metadata;
    // Check if user is the current owner
    const isCurrentOwner = artMetadata?.current_owner?.user_id === userId;
    if (!isCurrentOwner) {
      return NextResponse.json(
        { error: "Only the current owner can accept or reject offers" },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = updateOfferSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { status } = validation.data;

    // Get offer details before updating
    const { getAssetOffers } = await import("@/lib/firebase-admin");
    const offers = await getAssetOffers(assetUid);
    const offer = offers.find((o: any) => o.id === offerId);
    
    if (!offer) {
      return NextResponse.json(
        { error: "Offer not found" },
        { status: 404 }
      );
    }

    // Update offer status
    const updatedOffer = await updateOfferStatus(offerId, status, userId);

    log.info(`[Update Offer] Offer ${status}`, { offerId, assetUid, ownerId: userId });

    // If accepted, update artwork price in Contentstack (accepted offer is tracked in Firebase)
    if (status === "accepted") {
      try {
        const { updateAssetMetadata, triggerContentstackAutomation } = await import("@/lib/contentstack-am2");
        await updateAssetMetadata(assetUid, {
          price: offer.amount,
          currency: offer.currency,
        });

        // Trigger automation to publish changes
        triggerContentstackAutomation(assetUid);
      } catch (error: any) {
        log.error("[Update Offer] Failed to update asset metadata", error);
        // Don't fail the request, but log the error
      }
    }

    // Revalidate artwork page
    revalidatePath(`/art/${assetUid}`);

    return NextResponse.json({
      success: true,
      notice: `Offer ${status} successfully`,
      offer: {
        id: updatedOffer.id,
        status: updatedOffer.status,
      },
    });
  } catch (error: any) {
    log.error("Update offer error", error);
    
    if (error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: error.message || "Failed to update offer" },
      { status: 500 }
    );
  }
}

