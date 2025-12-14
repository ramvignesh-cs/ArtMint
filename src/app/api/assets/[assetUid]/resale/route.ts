import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, getServerUserProfile } from "@/lib/firebase-admin";
import { updateAssetMetadata, triggerContentstackAutomation, toMinimalAssetResponse, getAssetUsingAMV2API, getAssetFromCDA } from "@/lib/contentstack-am2";
import { log } from "@/lib/logger";
import { z } from "zod";

const resaleSchema = z.object({
  price: z.number().positive("Price must be positive").max(1000000, "Price exceeds maximum"),
  currency: z.string().min(1, "Currency is required").default("USD"),
});

/**
 * POST /api/assets/[assetUid]/resale
 * List an asset for resale (secondary market)
 * 
 * Only the current owner can list an asset for resale.
 * This updates the price and sets status to "resale".
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

    // Get current asset to verify ownership
    const currentAsset = await getAssetFromCDA(assetUid);
    const artMetadata = currentAsset.custom_metadata?.art_metadata;
    const owners = artMetadata?.owners || [];
    
    // Check if user is the current owner (last owner in the array)
    const isCurrentOwner = owners.length > 0 && owners[owners.length - 1]?.user_id === userId;
    
    if (!isCurrentOwner) {
      return NextResponse.json(
        { error: "Only the current owner can list this asset for resale" },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = resaleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid resale data", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { price, currency } = validation.data;

    // Get user profile for name
    const userProfile = await getServerUserProfile(userId);

    // Update asset for resale
    const asset = await updateAssetMetadata(assetUid, {
      price,
      currency,
      status: "resale",
    });

    // Trigger Contentstack Automation API (async, non-blocking)
    triggerContentstackAutomation(assetUid);

    const updatedAsset = await getAssetUsingAMV2API(assetUid);

    // Return only required fields for UI
    const minimalAsset = toMinimalAssetResponse(updatedAsset);

    return NextResponse.json({
      success: true,
      notice: "Asset listed for resale successfully",
      asset: minimalAsset,
    });
  } catch (error: any) {
    log.error("Resale asset error", error);
    
    if (error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: error.message || "Failed to list asset for resale" },
      { status: 500 }
    );
  }
}

