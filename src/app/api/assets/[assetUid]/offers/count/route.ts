import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, getAssetOffersCount } from "@/lib/firebase-admin";
import { getAssetFromCDA } from "@/lib/contentstack-am2";
import { log } from "@/lib/logger";

/**
 * GET /api/assets/[assetUid]/offers/count
 * Get count of pending offers for an asset (only accessible by current owner)
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
        { error: "Only the current owner can view offer count" },
        { status: 403 }
      );
    }

    // Get offer count
    const count = await getAssetOffersCount(assetUid);

    return NextResponse.json({
      success: true,
      count,
    });
  } catch (error: any) {
    log.error("Get offer count error", error);
    
    if (error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: error.message || "Failed to get offer count" },
      { status: 500 }
    );
  }
}

