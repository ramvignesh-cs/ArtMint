import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase-admin";
import { getAsset, toMinimalAssetResponse } from "@/lib/contentstack-am2";
import { log } from "@/lib/logger";

/**
 * GET /api/artworks/owned
 * Get all artworks owned by the authenticated user
 * 
 * Query params:
 * - limit: Number of artworks to return (default: 50)
 * - offset: Number of artworks to skip (default: 0)
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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get asset UIDs from wallet transactions
    // For now, we'll need to fetch all assets and filter by ownership
    // In production, you might want to maintain a separate index of owned assets
    
    // Note: This is a simplified approach. In production, you'd want to:
    // 1. Maintain a list of asset UIDs owned by each user
    // 2. Or query Contentstack with filters (if supported)
    // 3. Or use a search service that indexes ownership data

    // For now, we'll return an empty array and let the frontend handle it
    // by checking wallet transactions for assetUids
    
    return NextResponse.json({
      success: true,
      artworks: [],
      total: 0,
      limit,
      offset,
      message: "Use wallet transactions to get asset UIDs, then fetch each asset",
    });
  } catch (error: any) {
    log.error("Get owned artworks error", error);
    return NextResponse.json(
      { error: error.message || "Failed to get owned artworks" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/artworks/owned
 * Get owned artworks by providing asset UIDs
 * 
 * Body:
 * - assetUids: Array of asset UIDs to fetch
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

    const userId = decodedToken.uid;
    const body = await request.json();
    const { assetUids } = body;

    if (!Array.isArray(assetUids) || assetUids.length === 0) {
      return NextResponse.json({
        success: true,
        artworks: [],
        total: 0,
      });
    }

    // Fetch all assets in parallel
    const assetPromises = assetUids.map((uid: string) =>
      getAsset(uid).catch((error) => {
        log.error(`Failed to fetch asset`, error, { assetUid: uid });
        return null;
      })
    );

    const assets = await Promise.all(assetPromises);
    
    // Filter out nulls and verify ownership, then map to minimal format
    const ownedArtworks = assets
      .filter((asset) => {
        if (!asset) return false;
        const artMetadata = asset.custom_metadata?.art_metadata;
        return artMetadata?.owners?.some(
          (owner) => owner.user_id === userId
        );
      })
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
    log.error("Get owned artworks error", error);
    return NextResponse.json(
      { error: error.message || "Failed to get owned artworks" },
      { status: 500 }
    );
  }
}

