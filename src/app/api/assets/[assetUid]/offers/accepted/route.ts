import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, getAcceptedOffer } from "@/lib/firebase-admin";
import { log } from "@/lib/logger";

/**
 * GET /api/assets/[assetUid]/offers/accepted
 * Get accepted offer for an asset (accessible by the buyer who made the offer)
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
      return NextResponse.json(
        { error: "Asset UID is required" },
        { status: 400 }
      );
    }

    // Get accepted offer for this specific buyer
    const acceptedOffer = await getAcceptedOffer(assetUid, userId);

    // Only return if the offer is for this user
    if (!acceptedOffer) {
      return NextResponse.json({
        success: true,
        offer: null,
      });
    }

    // Check if the offer is for this user (trim and compare strings)
    const offerBuyerId = String(acceptedOffer.buyerId || "").trim();
    const requestUserId = String(userId || "").trim();

    if (offerBuyerId !== requestUserId) {
      return NextResponse.json({
        success: true,
        offer: null,
      });
    }

    // Convert Firestore Timestamp to ISO string if needed
    let createdAt: string;
    if (acceptedOffer.createdAt?.toDate) {
      createdAt = acceptedOffer.createdAt.toDate().toISOString();
    } else if (acceptedOffer.createdAt?.seconds) {
      createdAt = new Date(
        acceptedOffer.createdAt.seconds * 1000
      ).toISOString();
    } else if (acceptedOffer.createdAt) {
      createdAt =
        typeof acceptedOffer.createdAt === "string"
          ? acceptedOffer.createdAt
          : new Date(acceptedOffer.createdAt).toISOString();
    } else {
      createdAt = new Date().toISOString();
    }

    return NextResponse.json({
      success: true,
      offer: {
        id: acceptedOffer.id,
        assetUid: acceptedOffer.assetUid,
        buyerId: acceptedOffer.buyerId,
        buyerName: acceptedOffer.buyerName,
        amount: acceptedOffer.amount,
        currency: acceptedOffer.currency,
        message: acceptedOffer.message,
        status: acceptedOffer.status,
        createdAt,
      },
    });
  } catch (error: any) {
    log.error("Get accepted offer error", error);

    return NextResponse.json(
      { error: error.message || "Failed to get accepted offer" },
      { status: 500 }
    );
  }
}
