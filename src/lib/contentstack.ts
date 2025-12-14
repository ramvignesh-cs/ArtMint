/**
 * Contentstack Client Configuration
 * 
 * Handles both:
 * - Content Delivery API (CDA) - for reading assets/content
 * - Content Management API (CMA) - for creating/updating assets (server-side only)
 */

import { log } from "@/lib/logger";

// ==========================================
// Configuration
// ==========================================

const REGION_URLS: Record<string, { cda: string; cma: string }> = {
  NA: {
    cda: "https://cdn.contentstack.io",
    cma: "https://api.contentstack.io",
  },
  EU: {
    cda: "https://eu-cdn.contentstack.com",
    cma: "https://eu-api.contentstack.com",
  },
  AZURE_NA: {
    cda: "https://azure-na-cdn.contentstack.com",
    cma: "https://azure-na-api.contentstack.com",
  },
};

const region = process.env.CONTENTSTACK_REGION || "NA";
const apiKey = process.env.CONTENTSTACK_API_KEY || "";
const deliveryToken = process.env.CONTENTSTACK_DELIVERY_TOKEN || "";
const managementToken = process.env.CONTENTSTACK_MANAGEMENT_TOKEN || "";
const environment = process.env.CONTENTSTACK_ENVIRONMENT || "prod";

const urls = REGION_URLS[region] || REGION_URLS.NA;

// ==========================================
// Types
// ==========================================

export interface ArtworkMetadata {
  title: string;
  description?: string;
  category: string;
  artistId: string;
  artistName: string;
  price: number;
  currency: string;
  status: "draft" | "published" | "sold";
  owners: OwnerRecord[];
  createdAt: string;
  tags?: string[];
}

export interface OwnerRecord {
  userId: string;
  userName?: string;
  purchaseDate: string;
  transactionId: string;
}

export interface Asset {
  uid: string;
  title: string;
  filename: string;
  url: string;
  content_type: string;
  file_size: number;
  created_at: string;
  updated_at: string;
  metadata?: ArtworkMetadata;
  dimension?: {
    width: number;
    height: number;
  };
}

export interface AssetResponse {
  asset: Asset;
}

export interface AssetsListResponse {
  assets: Asset[];
  count: number;
}

// ==========================================
// Content Delivery API (CDA) - Public Reading
// ==========================================

/**
 * Fetch all artwork assets from Contentstack
 */
export async function getArtworks(options?: {
  category?: string;
  artistId?: string;
  limit?: number;
  skip?: number;
}): Promise<Asset[]> {
  const params = new URLSearchParams({
    environment,
    include_metadata: "true",
  });

  if (options?.limit) {
    params.set("limit", options.limit.toString());
  }
  if (options?.skip) {
    params.set("skip", options.skip.toString());
  }

  // Note: CDA filtering by metadata is limited
  // For production, you might want to use a content type with proper fields
  // or implement server-side filtering

  const response = await fetch(
    `${urls.cda}/v3/assets?${params.toString()}`,
    {
      headers: {
        api_key: apiKey,
        access_token: deliveryToken,
        "Content-Type": "application/json",
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    }
  );

  if (!response.ok) {
    const error = await response.text();
    log.error("Contentstack CDA error", error);
    throw new Error(`Failed to fetch artworks: ${response.status}`);
  }

  const data: AssetsListResponse = await response.json();

  // Filter by metadata on server-side
  let assets = data.assets.filter((asset) => {
    const metadata = asset.metadata as ArtworkMetadata | undefined;
    if (!metadata?.status) return false; // Only return assets with artwork metadata

    if (options?.category && metadata.category !== options.category) {
      return false;
    }
    if (options?.artistId && metadata.artistId !== options.artistId) {
      return false;
    }
    return metadata.status === "published";
  });

  return assets;
}

/**
 * Fetch single artwork by asset UID
 */
export async function getArtworkByUid(assetUid: string): Promise<Asset | null> {
  const params = new URLSearchParams({
    environment,
    include_metadata: "true",
  });

  const response = await fetch(
    `${urls.cda}/v3/assets/${assetUid}?${params.toString()}`,
    {
      headers: {
        api_key: apiKey,
        access_token: deliveryToken,
        "Content-Type": "application/json",
      },
      next: { revalidate: 30 },
    }
  );

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch artwork: ${response.status}`);
  }

  const data: AssetResponse = await response.json();
  return data.asset;
}

// ==========================================
// Content Management API (CMA) - Server-side Only
// ==========================================

/**
 * Upload a new asset to Contentstack
 * Must only be called from server-side (API routes)
 */
export async function uploadAsset(
  file: Buffer | Blob,
  filename: string,
  metadata: ArtworkMetadata
): Promise<Asset> {
  const formData = new FormData();

  // Create file blob if buffer
  const fileBlob =
    file instanceof Blob ? file : new Blob([file as unknown as ArrayBuffer], { type: "image/*" });

  formData.append("asset[upload]", fileBlob, filename);
  formData.append("asset[title]", metadata.title);
  formData.append("asset[description]", metadata.description || "");

  const response = await fetch(`${urls.cma}/v3/assets`, {
    method: "POST",
    headers: {
      api_key: apiKey,
      authorization: managementToken,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    log.error("Contentstack upload error", error);
    throw new Error(`Failed to upload asset: ${response.status}`);
  }

  const data: AssetResponse = await response.json();

  // Update metadata after upload
  await updateAssetMetadata(data.asset.uid, metadata);

  return data.asset;
}

/**
 * Update asset metadata (for ownership tracking)
 * Must only be called from server-side
 */
export async function updateAssetMetadata(
  assetUid: string,
  metadata: Partial<ArtworkMetadata>
): Promise<Asset> {
  const response = await fetch(`${urls.cma}/v3/assets/${assetUid}`, {
    method: "PUT",
    headers: {
      api_key: apiKey,
      authorization: managementToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      asset: {
        metadata,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    log.error("Contentstack update error", error);
    throw new Error(`Failed to update asset metadata: ${response.status}`);
  }

  const data: AssetResponse = await response.json();
  return data.asset;
}

/**
 * Add owner to asset metadata (used after purchase)
 * Preserves existing owners (append-only for ownership history)
 */
export async function addAssetOwner(
  assetUid: string,
  owner: OwnerRecord
): Promise<Asset> {
  // First, get current metadata
  const asset = await getArtworkByUid(assetUid);

  if (!asset) {
    throw new Error("Asset not found");
  }

  const currentMetadata = (asset.metadata as ArtworkMetadata) || {
    owners: [],
  };
  const currentOwners = currentMetadata.owners || [];

  // Append new owner (immutable pattern - never remove existing owners)
  const updatedOwners = [...currentOwners, owner];

  return updateAssetMetadata(assetUid, {
    ...currentMetadata,
    owners: updatedOwners,
    status: "sold",
  });
}

/**
 * Check if user already owns an asset
 */
export async function checkOwnership(
  assetUid: string,
  userId: string
): Promise<boolean> {
  const asset = await getArtworkByUid(assetUid);

  if (!asset?.metadata) return false;

  const metadata = asset.metadata as ArtworkMetadata;
  return metadata.owners?.some((owner) => owner.userId === userId) || false;
}

// ==========================================
// Helper Functions
// ==========================================

/**
 * Get categories from existing artworks
 */
export async function getCategories(): Promise<string[]> {
  const artworks = await getArtworks({ limit: 100 });

  const categories = new Set<string>();
  artworks.forEach((artwork) => {
    const metadata = artwork.metadata as ArtworkMetadata;
    if (metadata?.category) {
      categories.add(metadata.category);
    }
  });

  return Array.from(categories).sort();
}

/**
 * Get all unique artists from artworks
 */
export async function getArtists(): Promise<
  { id: string; name: string }[]
> {
  const artworks = await getArtworks({ limit: 100 });

  const artistMap = new Map<string, string>();
  artworks.forEach((artwork) => {
    const metadata = artwork.metadata as ArtworkMetadata;
    if (metadata?.artistId && metadata?.artistName) {
      artistMap.set(metadata.artistId, metadata.artistName);
    }
  });

  return Array.from(artistMap.entries()).map(([id, name]) => ({ id, name }));
}

