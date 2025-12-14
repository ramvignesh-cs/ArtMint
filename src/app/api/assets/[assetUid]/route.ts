import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, getServerUserProfile } from "@/lib/firebase-admin";
import { getAssetFromCDA, updateAssetMetadata, triggerContentstackAutomation, toMinimalAssetResponse, getAssetUsingAMV2API } from "@/lib/contentstack-am2";
import { assetUpdateSchema } from "@/lib/validations";

/**
 * GET /api/assets/[assetUid]
 * Get asset details by UID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetUid: string }> }
) {
  try {
    const { assetUid } = await params;

    if (!assetUid) {
      return NextResponse.json({ error: "Asset UID is required" }, { status: 400 });
    }

    const asset = await getAssetUsingAMV2API(assetUid);

    // Return only required fields for UI
    const minimalAsset = toMinimalAssetResponse(asset);

    return NextResponse.json({
      success: true,
      notice: "Asset retrieved successfully",
      asset: minimalAsset,
    });
  } catch (error: any) {
    log.error("Get asset error", error);
    
    if (error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: error.message || "Failed to get asset" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/assets/[assetUid]
 * Update asset metadata with permission checks
 * 
 * Permission Rules:
 * - Artist: Can always update price. Can update title/description only if asset not sold (status !== "sold").
 * - Current Owner: Can only update price (for resale). Cannot update title/description.
 * 
 * Allowed fields:
 * - title: Asset title (artist only, if not sold)
 * - description: Asset description (artist only, if not sold)
 * - tags: Array of tags (artist only, if not sold)
 * - price: Price (artist always, owner for resale)
 * - currency: Currency code
 * - status: "sold" | "sale" | "resale" (for resale, set to "resale")
 */
export async function PUT(
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

    // Get current asset to check permissions
    const currentAsset = await getAssetUsingAMV2API(assetUid);
    const artMetadata = currentAsset.custom_metadata?.art_metadata;
    const artistUid = artMetadata?.artist_uid;
    const currentStatus = artMetadata?.status;
    const owners = artMetadata?.owners || [];
    
    // Check if user is the current owner (last owner in the array)
    const isCurrentOwner = owners.length > 0 && owners[owners.length - 1]?.user_id === userId;
    const isArtist = artistUid === userId;
    
    if (!isArtist && !isCurrentOwner) {
      return NextResponse.json(
        { error: "You don't have permission to update this asset" },
        { status: 403 }
      );
    }

    // Get user profile to check role
    const profile = await getServerUserProfile(userId);
    const isArtistRole = (profile as any)?.role === "artist";

    // Parse request body
    const body = await request.json();

    // Validate input
    const validation = assetUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid update data", details: validation.error.errors },
        { status: 400 }
      );
    }

    const validated = validation.data;

    // Permission checks
    const isSold = currentStatus === "sold";
    const updateData: any = {};

    // Price: Artist can always update, owner can update for resale
    if (validated.price !== undefined) {
      if (isArtist || isCurrentOwner) {
        updateData.price = validated.price;
      } else {
        return NextResponse.json(
          { error: "You don't have permission to update the price" },
          { status: 403 }
        );
      }
    }

    // Currency: Can be updated with price
    if (validated.currency !== undefined) {
      updateData.currency = validated.currency;
    }

    // Title, Description, Tags: Only artist can update, and only if not sold
    if (validated.title !== undefined || validated.description !== undefined || validated.tags !== undefined) {
      if (!isArtistRole) {
        return NextResponse.json(
          { error: "Only the artist can update title, description, or tags" },
          { status: 403 }
        );
      }
      if (isSold) {
        return NextResponse.json(
          { error: "Cannot update title, description, or tags after the asset has been sold" },
          { status: 403 }
        );
      }
      if (validated.title !== undefined) updateData.title = validated.title;
      if (validated.description !== undefined) updateData.description = validated.description;
      if (validated.tags !== undefined) updateData.tags = validated.tags;
    }

    // Status: For resale, owner can set to "resale"
    if (validated.status !== undefined) {
      if (isCurrentOwner && validated.status === "resale") {
        updateData.status = "resale";
      } else if (isArtistRole) {
        updateData.status = validated.status;
      } else {
        return NextResponse.json(
          { error: "You don't have permission to update the status" },
          { status: 403 }
        );
      }
    }

    // Update asset metadata
    const asset = await updateAssetMetadata(assetUid, updateData);

    // Trigger Contentstack Automation API (async, non-blocking)
    // Only trigger if asset is not sold, or if it's being updated by current owner/artist
    if (!isSold || isCurrentOwner || isArtist) {
      triggerContentstackAutomation(assetUid);
    }

    const updatedAsset = await getAssetUsingAMV2API(assetUid);

    // Return only required fields for UI
    const minimalAsset = toMinimalAssetResponse(updatedAsset);

    return NextResponse.json({
      success: true,
      notice: "Asset updated successfully",
      asset: minimalAsset,
    });
  } catch (error: any) {
    log.error("Update asset error", error);
    
    if (error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: error.message || "Failed to update asset" },
      { status: 500 }
    );
  }
}


