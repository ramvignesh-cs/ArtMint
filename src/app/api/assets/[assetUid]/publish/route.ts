import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, getServerUserProfile } from "@/lib/firebase-admin";
import { publishAsset, toMinimalAssetResponse } from "@/lib/contentstack-am2";
import { log } from "@/lib/logger";

/**
 * POST /api/assets/[assetUid]/publish
 * Publish an asset (set status to "sale")
 * Only artists can publish their own assets
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

    // Get user profile and verify artist role
    const profile = await getServerUserProfile(decodedToken.uid);

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    if ((profile as any).role !== "artist") {
      return NextResponse.json(
        { error: "Only artists can publish assets" },
        { status: 403 }
      );
    }

    const { assetUid } = await params;

    if (!assetUid) {
      return NextResponse.json({ error: "Asset UID is required" }, { status: 400 });
    }

    // Verify the asset belongs to the artist
    const { getAssetUsingAMV2API } = await import("@/lib/contentstack-am2");
    const asset = await getAssetUsingAMV2API(assetUid);

    if (asset.custom_metadata.art_metadata.artist_uid !== decodedToken.uid) {
      return NextResponse.json(
        { error: "You can only publish your own assets" },
        { status: 403 }
      );
    }

    // Publish asset (set status to "sale")
    const updatedAsset = await publishAsset(assetUid);

    // Return only required fields for UI
    const minimalAsset = toMinimalAssetResponse(updatedAsset);

    return NextResponse.json({
      success: true,
      notice: "Asset published successfully",
      asset: minimalAsset,
    });
  } catch (error: any) {
    log.error("Publish asset error", error);
    
    if (error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: error.message || "Failed to publish asset" },
      { status: 500 }
    );
  }
}

