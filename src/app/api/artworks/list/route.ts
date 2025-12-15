import { NextRequest, NextResponse } from "next/server";
import { listAssets, toMinimalAssetResponse } from "@/lib/contentstack-am2";
import { galleryFilterSchema } from "@/lib/validations";
import { log } from "@/lib/logger";

/**
 * GET /api/artworks/list
 * List all published artworks from Contentstack
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse and validate query params
    const params = {
      category: searchParams.get("category") || undefined,
      artistId: searchParams.get("artistId") || undefined,
      status: (searchParams.get("status") as "sale" | "resale" | "sold" | "all") || undefined,
      minPrice: searchParams.get("minPrice")
        ? parseFloat(searchParams.get("minPrice")!)
        : undefined,
      maxPrice: searchParams.get("maxPrice")
        ? parseFloat(searchParams.get("maxPrice")!)
        : undefined,
      sortBy: searchParams.get("sortBy") as any || undefined,
      page: searchParams.get("page")
        ? parseInt(searchParams.get("page")!)
        : undefined,
      limit: searchParams.get("limit")
        ? parseInt(searchParams.get("limit")!)
        : undefined,
    };

    const validation = galleryFilterSchema.safeParse(params);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { category, artistId, minPrice, maxPrice, status, limit, page, sortBy } = validation.data;
    const searchTerm = searchParams.get("search") || undefined;

    // Calculate skip for pagination
    const skip = page && limit ? (page - 1) * limit : undefined;

    // Build MongoDB query filter
    const query: Record<string, any> = {};

    // Filter by status
    if (status && status !== "all") {
      query["custom_metadata.art_metadata.status"] = status;
    } else {
      // Default: only show sale/resale items (exclude sold)
      query["custom_metadata.art_metadata.status"] = { $in: ["sale", "resale"] };
    }

    // Filter by category
    if (category && category !== "All") {
      query["custom_metadata.art_metadata.category"] = category;
    }

    // Filter by artist
    if (artistId) {
      query["custom_metadata.art_metadata.artist_uid"] = artistId;
    }

    // Filter by price range
    if (minPrice !== undefined || maxPrice !== undefined) {
      query["custom_metadata.art_metadata.price"] = {};
      if (minPrice !== undefined) {
        query["custom_metadata.art_metadata.price"].$gte = minPrice;
      }
      if (maxPrice !== undefined) {
        query["custom_metadata.art_metadata.price"].$lte = maxPrice;
      }
    }

    // Search by title or artist name (using MongoDB regex)
    if (searchTerm) {
      query.$or = [
        { title: { $regex: searchTerm, $options: "i" } },
        { "custom_metadata.art_metadata.artist_name": { $regex: searchTerm, $options: "i" } },
      ];
    }

    // Fetch artworks from Contentstack AM2 using CDA with MongoDB query
    const assets = await listAssets({
      query: Object.keys(query).length > 0 ? query : undefined,
      limit: limit || 50,
      skip,
    });

    // Sort assets if needed (Contentstack may not support all sort options)
    let sortedAssets = assets;
    if (sortBy) {
      sortedAssets = [...assets].sort((a, b) => {
        const artMetadataA = a.custom_metadata?.art_metadata;
        const artMetadataB = b.custom_metadata?.art_metadata;
        
        switch (sortBy) {
          case "price_asc":
            return (artMetadataA?.price || 0) - (artMetadataB?.price || 0);
          case "price_desc":
            return (artMetadataB?.price || 0) - (artMetadataA?.price || 0);
          case "newest":
          default:
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
      });
    }

    // Map to minimal response format and then to UI format
    const artworks = sortedAssets.map((asset) => {
      const minimalAsset = toMinimalAssetResponse(asset);
      const artMetadata = minimalAsset.custom_metadata.art_metadata;
      
      return {
        uid: minimalAsset.uid,
        title: minimalAsset.title,
        filename: minimalAsset.file_name,
        url: minimalAsset.url,
        content_type: minimalAsset.content_type,
        file_size: minimalAsset.file_size,
        created_at: minimalAsset.created_at,
        updated_at: minimalAsset.updated_at,
        dimension: minimalAsset.dimensions,
        metadata: {
          title: minimalAsset.title,
          description: minimalAsset.description || undefined,
          category: artMetadata?.category || "Uncategorized",
          artistId: artMetadata?.artist_uid || "",
          artistName: artMetadata?.artist_name || "Unknown Artist",
          price: artMetadata?.price || 0,
          currency: artMetadata?.currency || "USD",
          status: artMetadata?.status === "sold" ? "sold" : artMetadata?.status === "sale" || artMetadata?.status === "resale" ? "published" : "draft",
          current_owner: artMetadata?.current_owner ? {
            userId: artMetadata.current_owner.user_id || "",
            userName: artMetadata.current_owner.user_name || undefined,
            purchaseDate: artMetadata.current_owner.purchase_date || "",
            transactionId: artMetadata.current_owner.transaction_id || "",
          } : null,
          ownership_history: (artMetadata?.ownership_history || []).map((owner) => ({
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

    // Extract unique categories and artists from the fetched artworks
    const categoriesSet = new Set<string>();
    const artistsSet = new Set<{ id: string; name: string }>();
    
    assets.forEach((asset) => {
      const artMetadata = asset.custom_metadata?.art_metadata;
      if (artMetadata?.category) {
        categoriesSet.add(artMetadata.category);
      }
      if (artMetadata?.artist_uid && artMetadata?.artist_name) {
        artistsSet.add({
          id: artMetadata.artist_uid,
          name: artMetadata.artist_name,
        });
      }
    });

    const categories = Array.from(categoriesSet).sort();
    const artists = Array.from(artistsSet);

    return NextResponse.json({
      artworks,
      total: artworks.length,
      page: page || 1,
      limit: limit || 50,
      filters: {
        categories: ["All", ...categories],
        artists,
      },
    });
  } catch (error: any) {
    log.error("Artworks list error", error);
    return NextResponse.json(
      { error: "Failed to fetch artworks" },
      { status: 500 }
    );
  }
}

