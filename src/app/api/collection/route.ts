import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase-admin";
import { getUserAssets } from "@/lib/firebase-admin";
import { getAssetFromCDA, toMinimalAssetResponse } from "@/lib/contentstack-am2";
import { log } from "@/lib/logger";

/**
 * GET /api/collection
 * Get user's collection of owned artworks
 */
export async function GET(request: NextRequest) {
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

    // Get user's asset collection from Firestore
    const userAssets = await getUserAssets(userId);

    if (!userAssets.assets || userAssets.assets.length === 0) {
      return NextResponse.json({
        success: true,
        artworks: [],
        total: 0,
      });
    }

    // Fetch full asset details from Contentstack AM2
    const assetPromises = userAssets.assets.map((assetData: any) =>
      getAssetFromCDA(assetData.assetUid).catch((error) => {
        log.error(`Failed to fetch asset`, error, { assetUid: assetData.assetUid });
        return null;
      })
    );

    const assets = await Promise.all(assetPromises);

    // Filter out nulls and map to minimal UI format
    const ownedArtworks = assets
      .filter((asset) => asset !== null)
      .map((asset) => {
        const minimalAsset = toMinimalAssetResponse(asset!);
        const artMetadata = minimalAsset.custom_metadata.art_metadata;
        
        // Map to UI format (keeping existing structure for compatibility)
        return {
          uid: minimalAsset.uid,
          title: minimalAsset.title,
          filename: minimalAsset.file_name,
          url: minimalAsset.url,
          content_type: minimalAsset.content_type,
          file_size: minimalAsset.file_size,
          created_at: minimalAsset.created_at,
          updated_at: minimalAsset.updated_at,
          dimensions: minimalAsset.dimensions,
          tags: minimalAsset.tags,
          metadata: {
            title: minimalAsset.title,
            description: minimalAsset.description || undefined,
            category: artMetadata?.category || "Uncategorized",
            artistId: artMetadata?.artist_uid || "",
            artistName: artMetadata?.artist_name || "Unknown Artist",
            price: artMetadata?.price || 0,
            currency: artMetadata?.currency || "USD",
            status: artMetadata?.status === "sold" ? "sold" : artMetadata?.status === "sale" ? "published" : "draft",
            owners: (artMetadata?.owners || []).map((owner) => ({
              userId: owner.user_id || "",
              userName: owner.user_name || undefined,
              purchaseDate: owner.purchase_date || "",
              transactionId: owner.transaction_id || "",
            })),
            createdAt: minimalAsset.created_at,
            tags: minimalAsset.tags || [],
          },
        };
      });

    return NextResponse.json({
      success: true,
      artworks: ownedArtworks,
      total: ownedArtworks.length,
    });
  } catch (error: any) {
    log.error("Get collection error", error);
    return NextResponse.json(
      { error: error.message || "Failed to get collection" },
      { status: 500 }
    );
  }
}

