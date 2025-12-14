/**
 * Contentstack Asset Management 2.0 Client
 *
 * Handles asset operations using the new Asset Management 2.0 API:
 * - Upload assets
 * - Update asset metadata
 * - Get asset details
 * - Publish assets
 */

import { log } from "@/lib/logger";

// ==========================================
// Configuration
// ==========================================

const AM_API_BASE_URL =
  process.env.CONTENTSTACK_AM_API_BASE_URL || "https://am-api.contentstack.com";
const API_VERSION = process.env.CONTENTSTACK_AM_API_VERSION || "4";
const publishAutomationApiUrl = process.env.CONTENTSTACK_PUBLISH_AUTOMATION_API;
const apiKey = process.env.CONTENTSTACK_API_KEY || "";

// CDA (Content Delivery API) configuration for reading assets
const CDA_API_BASE_URL =
  process.env.CONTENTSTACK_CDA_API_BASE_URL || "https://cdn.contentstack.io";
const environment = process.env.CONTENTSTACK_ENVIRONMENT || "prod";
const deliveryToken = process.env.CONTENTSTACK_DELIVERY_TOKEN || "";

// Management API configuration (for write operations)
const spaceUid = process.env.CONTENTSTACK_AM_SPACE_UID || "";
const organizationUid = process.env.CONTENTSTACK_ORGANIZATION_UID || "";
const managementToken = process.env.CONTENTSTACK_MANAGEMENT_TOKEN || "";
const accessToken = process.env.CONTENTSTACK_ACCESS_TOKEN || "";
const workspace = process.env.CONTENTSTACK_AM_WORKSPACE || "main";
const locale = process.env.CONTENTSTACK_AM_LOCALE || "en-us";

// ==========================================
// Types
// ==========================================

export interface ArtMetadata {
  artist_uid: string | null;
  artist_name: string | null;
  price: number | null;
  currency: string | null;
  status: "sold" | "sale" | "resale" | null;
  category: string | null;
  owners: OwnerRecord[];
}

export interface OwnerRecord {
  user_id: string | null;
  user_name: string | null;
  purchase_date: string | null;
  transaction_id: string | null;
}

export interface CustomMetadata {
  art_metadata: ArtMetadata;
}

export interface AssetDimensions {
  width: number;
  height: number;
}

export interface AssetMetaInfo {
  downloads_count: number;
  views_count: number;
  last_accessed_at: string | null;
}

export interface ContentstackAsset {
  uid: string;
  file_name: string;
  asset_id: string;
  parent_uid: string;
  org_uid: string;
  space_uid: string;
  is_dir: boolean;
  path: string[];
  version: number;
  asset_type_uid: string;
  url: string;
  owner_uid: string;
  meta_info: AssetMetaInfo;
  is_system: boolean;
  visual_markups: any[];
  title: string;
  description: string | null;
  content_type: string;
  file_size: number;
  dimensions: AssetDimensions;
  file_extension: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  tags: string[];
  locale: string;
  custom_metadata: CustomMetadata;
}

/**
 * Minimal asset response for UI - only includes fields needed by frontend
 */
export interface MinimalAssetResponse {
  uid: string;
  title: string;
  file_name: string;
  url: string;
  content_type: string;
  file_size: number;
  created_at: string;
  updated_at: string;
  dimensions?: {
    width: number;
    height: number;
  };
  description?: string | null;
  tags: string[];
  custom_metadata: {
    art_metadata: {
      artist_uid: string | null;
      artist_name: string | null;
      price: number | null;
      currency: string | null;
      status: "sold" | "sale" | "resale" | null;
      category: string | null;
      owners: Array<{
        user_id: string | null;
        user_name: string | null;
        purchase_date: string | null;
        transaction_id: string | null;
      }>;
    };
  };
}

/**
 * Transform ContentstackAsset to minimal UI response format
 * Removes unnecessary fields to reduce payload size
 */
export function toMinimalAssetResponse(
  asset: ContentstackAsset
): MinimalAssetResponse {
  // https://am-api.contentstack.com/spaces/{space_uid}/assets/{asset_uid}/{asset_id}/{file_name}?locale={locale}&organization_uid={organization_uid}
  // https://images.contentstack.io/v3/assets/{asset_id}/{asset_uid}/{file_name}?environment={environment}
  const cdnURLPath = new URL(asset.url).pathname.split("/");
  const spaceAssetUrl = `${AM_API_BASE_URL}/spaces/${spaceUid}/assets/${asset.uid}/${cdnURLPath[5]}/${cdnURLPath[6]}?locale=${locale}&organization_uid=${organizationUid}`;
  return {
    uid: asset.uid,
    title: asset.title,
    file_name: asset.file_name,
    url: spaceAssetUrl,
    content_type: asset.content_type,
    file_size: asset.file_size,
    created_at: asset.created_at,
    updated_at: asset.updated_at,
    dimensions: asset.dimensions
      ? {
          width: asset.dimensions.width,
          height: asset.dimensions.height,
        }
      : undefined,
    description: asset.description,
    tags: asset.tags || [],
    custom_metadata: {
      art_metadata: {
        artist_uid: asset.custom_metadata?.art_metadata?.artist_uid || null,
        artist_name: asset.custom_metadata?.art_metadata?.artist_name || null,
        price: asset.custom_metadata?.art_metadata?.price || null,
        currency: asset.custom_metadata?.art_metadata?.currency || null,
        status: asset.custom_metadata?.art_metadata?.status || null,
        category: asset.custom_metadata?.art_metadata?.category || null,
        owners: (asset.custom_metadata?.art_metadata?.owners || []).map(
          (owner) => ({
            user_id: owner.user_id || null,
            user_name: owner.user_name || null,
            purchase_date: owner.purchase_date || null,
            transaction_id: owner.transaction_id || null,
          })
        ),
      },
    },
  };
}

export interface AssetUploadResponse {
  notice: string;
  asset: ContentstackAsset;
}

export interface AssetUpdateRequest {
  title?: string;
  description?: string;
  tags?: string[];
  file_name?: string;
  uid?: string;
  file_url?: string;
  mime_type?: string;
  file_size?: string;
  updated_at?: string;
  created_by?: string;
  asset_type?: string;
  updated_by?: string;
  created_at?: string;
  custom_metadata?: CustomMetadata;
  asset_id?: string;
  visual_markups?: any[];
}

export interface AssetUploadParams {
  file: File | Blob | Buffer;
  filename: string;
  mimeType?: string;
  artist_uid: string;
  artist_name: string;
  price: number;
  currency: string;
  category: string;
  status: "sold" | "sale" | "resale";
  tags?: string[];
  description?: string;
  title?: string;
}

export interface AssetUpdateParams {
  title?: string;
  description?: string;
  tags?: string[];
  artist_uid?: string;
  artist_name?: string;
  price?: number;
  currency?: string;
  category?: string;
  status?: "sold" | "sale" | "resale";
  owners?: OwnerRecord[];
}

// ==========================================
// Helper Functions
// ==========================================

function getHeaders(): Record<string, string> {
  return {
    accept: "application/json, text/plain, */*",
    organization_uid: organizationUid,
    "x-cs-api-version": API_VERSION,
    ...(accessToken
      ? { access_token: accessToken }
      : { authorization: managementToken }),
  };
}

function buildAssetUrl(
  assetUid: string,
  params?: { locale?: string; workspace?: string }
): string {
  const queryParams = new URLSearchParams();
  const localeValue = params?.locale || locale;
  const workspaceValue = params?.workspace || workspace;

  if (localeValue) queryParams.set("locale", localeValue);
  if (workspaceValue) queryParams.set("workspace", workspaceValue);

  return `${AM_API_BASE_URL}/api/spaces/${spaceUid}/assets/${assetUid}?${queryParams.toString()}`;
}

function buildUploadUrl(params?: { workspace?: string }): string {
  const queryParams = new URLSearchParams();
  const workspaceValue = params?.workspace || workspace;

  if (workspaceValue) queryParams.set("workspace", workspaceValue);

  return `${AM_API_BASE_URL}/api/spaces/${spaceUid}/assets?${queryParams.toString()}`;
}

/**
 * Detect MIME type from file extension
 */
function getMimeTypeFromFilename(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop() || "";

  const mimeTypes: Record<string, string> = {
    // Images
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    bmp: "image/bmp",
    tiff: "image/tiff",
    tif: "image/tiff",
    // Videos
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    // Documents
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    // Other
    json: "application/json",
    xml: "application/xml",
    txt: "text/plain",
  };

  return mimeTypes[ext] || "application/octet-stream";
}

/**
 * Handle Contentstack API errors with proper logging and user-friendly messages
 */
function handleContentstackError(
  operation: string,
  response: Response,
  errorBody: string,
  context?: Record<string, any>
): never {
  let errorData: any;
  try {
    errorData = JSON.parse(errorBody);
  } catch {
    errorData = { raw: errorBody };
  }

  // Log detailed error for debugging
  log.error(`[Contentstack AM2 Error] ${operation}`, undefined, {
    status: response.status,
    statusText: response.statusText,
    errorCode: errorData.error_code,
    errorMessage: errorData.error_message,
    errors: errorData.errors,
    context: {
      spaceUid,
      organizationUid: organizationUid
        ? `${organizationUid.substring(0, 8)}...`
        : "missing",
      workspace,
      locale,
      ...context,
    },
    rawError: errorData,
  });

  // Map Contentstack error codes to user-friendly messages
  const errorCode = errorData.error_code;
  const errorMessage = errorData.error_message || "";

  let userMessage: string;

  switch (errorCode) {
    case 109:
      // Stack/API key not found
      userMessage =
        "Contentstack configuration error. Please check your space and API credentials.";
      break;
    case 401:
    case 403:
      userMessage =
        "Authentication failed. Please check your management token.";
      break;
    case 404:
      userMessage = "The requested resource was not found.";
      break;
    case 412:
      // Precondition failed
      if (errorMessage.includes("Stack") || errorMessage.includes("api_key")) {
        userMessage =
          "Contentstack configuration error. Please verify your space UID and API credentials.";
      } else {
        userMessage =
          "Request validation failed. Please check your input data.";
      }
      break;
    case 422:
      userMessage =
        "Invalid request data. Please check your input and try again.";
      break;
    case 429:
      userMessage = "Rate limit exceeded. Please try again later.";
      break;
    case 500:
    case 502:
    case 503:
      userMessage =
        "Contentstack service is temporarily unavailable. Please try again later.";
      break;
    default:
      // Generic error message
      if (response.status >= 400 && response.status < 500) {
        userMessage = "Invalid request. Please check your input and try again.";
      } else if (response.status >= 500) {
        userMessage =
          "Service temporarily unavailable. Please try again later.";
      } else {
        userMessage = "An error occurred while processing your request.";
      }
  }

  throw new Error(userMessage);
}

// ==========================================
// Asset Operations
// ==========================================

/**
 * Upload a new asset to Contentstack Asset Management 2.0
 */
export async function uploadAsset(
  params: AssetUploadParams
): Promise<ContentstackAsset> {
  if (!spaceUid || !organizationUid || !managementToken) {
    throw new Error(
      "Contentstack configuration is missing. Please check environment variables."
    );
  }

  const formData = new FormData();

  // Determine MIME type
  let mimeType: string;
  if (params.mimeType) {
    mimeType = params.mimeType;
  } else if (params.file instanceof File) {
    mimeType = params.file.type || getMimeTypeFromFilename(params.filename);
  } else if (params.file instanceof Blob && params.file.type) {
    mimeType = params.file.type;
  } else {
    mimeType = getMimeTypeFromFilename(params.filename);
  }

  // Convert Buffer to Blob if needed, with proper MIME type
  let fileBlob: Blob;
  if (Buffer.isBuffer(params.file)) {
    // Convert Buffer to Uint8Array for Blob compatibility, with MIME type
    fileBlob = new Blob([new Uint8Array(params.file)], { type: mimeType });
  } else if (params.file instanceof File) {
    // File already has type, use it directly (it will preserve the MIME type)
    fileBlob = params.file;
  } else if (params.file instanceof Blob) {
    // Use existing Blob type or create new one with detected type
    fileBlob = params.file.type
      ? params.file
      : new Blob([params.file], { type: mimeType });
  } else {
    fileBlob = new Blob([params.file], { type: mimeType });
  }

  // Append file with proper MIME type
  formData.append("file", fileBlob, params.filename);

  // Build custom metadata
  const customMetadata: CustomMetadata = {
    art_metadata: {
      artist_uid: params.artist_uid,
      artist_name: params.artist_name,
      price: params.price,
      currency: params.currency,
      status: params.status,
      category: params.category,
      owners: [],
    },
  };

  // Note: The API might require metadata to be sent differently
  // Based on the curl example, we're only sending the file
  // Metadata might need to be updated after upload

  const headers = getHeaders();
  // Remove content-type for FormData (browser/Node will set it with boundary)
  const { "content-type": _, ...headersWithoutContentType } = headers;

  const response = await fetch(buildUploadUrl(), {
    method: "POST",
    headers: headersWithoutContentType,
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    handleContentstackError("uploadAsset", response, errorText, {
      filename: params.filename,
      fileSize: params.file instanceof Buffer ? params.file.length : "unknown",
    });
  }

  const data: AssetUploadResponse = await response.json();

  // Create initial owner record for the artist (first owner)
  const artistOwner: OwnerRecord = {
    user_id: params.artist_uid,
    user_name: params.artist_name,
    purchase_date: new Date().toISOString(),
    transaction_id: "CREATOR", // Special identifier for the original creator
  };

  // Update metadata after upload if provided
  if (params.description || params.tags || params.title || customMetadata) {
    try {
      await updateAssetMetadata(data.asset.uid, {
        title: params.title || params.filename,
        description: params.description,
        tags: params.tags || [],
        artist_uid: params.artist_uid,
        artist_name: params.artist_name,
        price: params.price,
        currency: params.currency,
        category: params.category,
        status: params.status,
        owners: [artistOwner], // Add artist as the first owner
      });
    } catch (error) {
      log.error("Failed to update metadata after upload", error);
      // Don't throw - asset was uploaded successfully
    }
  }

  // Fetch the updated asset to return with the owner
  try {
    const updatedAsset = await getAssetUsingAMV2API(data.asset.uid);
    return updatedAsset;
  } catch (error) {
    // If fetching fails, return the original asset
    return data.asset;
  }
}

/**
 * Update asset metadata
 */
export async function updateAssetMetadata(
  assetUid: string,
  params: AssetUpdateParams
): Promise<ContentstackAsset> {
  if (!spaceUid || !organizationUid || !managementToken) {
    throw new Error(
      "Contentstack configuration is missing. Please check environment variables."
    );
  }

  // First, get the current asset to preserve existing data
  const currentAsset = await getAssetUsingAMV2API(assetUid);

  // Build update request
  const updateRequest: AssetUpdateRequest = {
    title: params.title || currentAsset.title,
    description:
      params.description !== undefined
        ? params.description
        : currentAsset.description ?? undefined,
    tags: params.tags || currentAsset.tags,
    custom_metadata: {
      art_metadata: {
        artist_uid:
          params.artist_uid ||
          currentAsset.custom_metadata.art_metadata.artist_uid,
        artist_name:
          params.artist_name ||
          currentAsset.custom_metadata.art_metadata.artist_name,
        price:
          params.price !== undefined
            ? params.price
            : currentAsset.custom_metadata.art_metadata.price,
        currency:
          params.currency || currentAsset.custom_metadata.art_metadata.currency,
        status:
          params.status || currentAsset.custom_metadata.art_metadata.status,
        category:
          params.category || currentAsset.custom_metadata.art_metadata.category,
        owners:
          params.owners || currentAsset.custom_metadata.art_metadata.owners,
      },
    },
    visual_markups: currentAsset.visual_markups,
  };

  const headers = {
    ...getHeaders(),
    "content-type": "application/json",
  };

  const response = await fetch(buildAssetUrl(assetUid), {
    method: "PUT",
    headers,
    body: JSON.stringify(updateRequest),
  });

  if (!response.ok) {
    const errorText = await response.text();
    handleContentstackError("updateAssetMetadata", response, errorText, {
      assetUid,
    });
  }

  const data: AssetUploadResponse = await response.json();
  return data.asset;
}

/**
 * Get asset using Asset Management 2.0 API (Management API)
 * This uses the AM2 Management API which requires management token/access token
 * Use this when you need to get asset details with full metadata for server-side operations
 * 
 * @param assetUid - The UID of the asset to retrieve
 * @returns Promise<ContentstackAsset> - The asset data
 */
export async function getAssetUsingAMV2API(assetUid: string): Promise<ContentstackAsset> {
  if (!managementToken && !accessToken) {
    throw new Error(
      "Contentstack AM2 Management configuration is missing. Please check CONTENTSTACK_MANAGEMENT_TOKEN or CONTENTSTACK_ACCESS_TOKEN environment variables."
    );
  }

  if (!spaceUid || !organizationUid) {
    throw new Error(
      "Contentstack AM2 space configuration is missing. Please check CONTENTSTACK_AM_SPACE_UID and CONTENTSTACK_ORGANIZATION_UID environment variables."
    );
  }

  const url = buildAssetUrl(assetUid);
  const headers = getHeaders();

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      handleContentstackError("getAssetUsingAMV2API", response, errorBody, {
        assetUid,
        url,
      });
    }

    const data = await response.json();

    // AM2 API returns asset directly in the response
    if (data.asset) {
      return data.asset as ContentstackAsset;
    }

    // Sometimes the response might be the asset itself
    if (data.uid) {
      return data as ContentstackAsset;
    }

    throw new Error("Unexpected response format from AM2 API");
  } catch (error: any) {
    if (error instanceof Error && error.message.includes("Contentstack AM2 Error")) {
      throw error;
    }
    log.error(`[Contentstack AM2 Error] getAssetUsingAMV2API`, error, {
      assetUid,
    });
    throw new Error(`Failed to get asset from AM2 API: ${error.message}`);
  }
}

/**
 * Get asset using Content Delivery API (CDA)
 * This uses the CDA which is optimized for public read operations
 * Use this for client-side or public-facing operations
 * 
 * @param assetUid - The UID of the asset to retrieve
 * @returns Promise<ContentstackAsset> - The asset data
 */
export async function getAssetFromCDA(assetUid: string): Promise<ContentstackAsset> {
  if (!apiKey || !deliveryToken) {
    throw new Error(
      "Contentstack CDA configuration is missing. Please check CONTENTSTACK_API_KEY and CONTENTSTACK_DELIVERY_TOKEN environment variables."
    );
  }

  // Build CDA URL: https://cdn.contentstack.io/v3/assets/{assetUid}?environment={environment}
  const params = new URLSearchParams({
    environment,
    include_metadata: "true", // Include custom metadata
  });
  const cdaUrl = `${CDA_API_BASE_URL}/v3/assets/${assetUid}?${params.toString()}`;

  const headers = {
    api_key: apiKey,
    access_token: deliveryToken,
    "Content-Type": "application/json",
  };

  const response = await fetch(cdaUrl, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 404) {
      // Special handling for 404 - asset not found
      log.error(`[Contentstack CDA Error] getAssetFromCDA - Asset not found`, undefined, {
        assetUid,
        status: response.status,
        environment,
      });
      throw new Error(`Asset not found: ${assetUid}`);
    }

    // Handle CDA errors
    let errorMessage = "An unexpected error occurred with Contentstack CDA.";
    let userMessage = "An unexpected error occurred. Please try again.";

    try {
      const errorJson = JSON.parse(errorText);
      const errorMsg =
        errorJson.error_message || errorJson.errors?.[0] || errorText;

      switch (response.status) {
        case 401:
        case 403:
          userMessage =
            "Authentication failed. Please check your API credentials.";
          break;
        case 404:
          userMessage = "The requested asset was not found.";
          break;
        case 422:
          userMessage =
            "Invalid request data. Please check your input and try again.";
          break;
        case 429:
          userMessage = "Rate limit exceeded. Please try again later.";
          break;
        case 500:
        case 502:
        case 503:
          userMessage =
            "Contentstack service is temporarily unavailable. Please try again later.";
          break;
        default:
          userMessage = errorMsg || `Contentstack error: ${response.status}`;
          break;
      }

      errorMessage = errorMsg;
    } catch (e) {
      errorMessage = errorText;
    }

    log.error(`[Contentstack CDA Error] getAssetFromCDA`, undefined, {
      status: response.status,
      statusText: response.statusText,
      errorMessage,
      assetUid,
      environment,
    });

    throw new Error(userMessage);
  }

  // CDA returns asset directly in response, not wrapped in { asset: ... }
  const data = await response.json();

  // CDA response structure might be different, so we need to handle both formats
  // If it's already a ContentstackAsset, return it; otherwise check for nested asset
  if (data.uid) {
    // Direct asset object
    return data as ContentstackAsset;
  } else if (data.asset) {
    // Wrapped in { asset: ... }
    return data.asset as ContentstackAsset;
  } else {
    // Unexpected format
    log.error("[Contentstack CDA] Unexpected response format", undefined, { data });
    throw new Error("Unexpected response format from Contentstack CDA");
  }
}

/**
 * Add owner to asset (for purchase tracking)
 * Preserves existing owners (append-only for ownership history)
 */
export async function addAssetOwner(
  assetUid: string,
  owner: OwnerRecord
): Promise<ContentstackAsset> {
  const asset = await getAssetUsingAMV2API(assetUid);
  const currentOwners = asset.custom_metadata.art_metadata.owners || [];

  // Append new owner (immutable pattern - never remove existing owners)
  const updatedOwners = [...currentOwners, owner];

  return updateAssetMetadata(assetUid, {
    owners: updatedOwners,
    status: "sold",
  });
}

/**
 * Update asset status
 */
export async function updateAssetStatus(
  assetUid: string,
  status: "sold" | "sale" | "resale"
): Promise<ContentstackAsset> {
  return updateAssetMetadata(assetUid, { status });
}

/**
 * Publish asset (if needed - depends on Contentstack workflow)
 * Note: This might require additional API calls depending on Contentstack configuration
 */
export async function publishAsset(
  assetUid: string
): Promise<ContentstackAsset> {
  // For now, publishing is handled by setting status to "sale"
  // If Contentstack has a separate publish workflow, this would need to be implemented
  return updateAssetStatus(assetUid, "sale");
}

/**
 * List all assets from Contentstack using CDA
 * Returns assets that are available for sale (status: "sale" or "resale")
 */
export async function listAssets(options?: {
  category?: string;
  artistId?: string;
  limit?: number;
  skip?: number;
  query?: Record<string, any>; // MongoDB query filter
}): Promise<ContentstackAsset[]> {
  if (!apiKey || !deliveryToken) {
    throw new Error(
      "Contentstack CDA configuration is missing. Please check CONTENTSTACK_API_KEY and CONTENTSTACK_DELIVERY_TOKEN environment variables."
    );
  }

  // Build CDA URL: https://cdn.contentstack.io/v3/assets?environment={environment}&include_metadata=true
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

  // Add MongoDB query filter if provided
  if (options?.query && Object.keys(options.query).length > 0) {
    params.set("query", JSON.stringify(options.query));
  }

  const cdaUrl = `${CDA_API_BASE_URL}/v3/assets?${params.toString()}`;

  const headers = {
    api_key: apiKey,
    access_token: deliveryToken,
    "Content-Type": "application/json",
  };

  const response = await fetch(cdaUrl, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    log.error("[Contentstack CDA Error] listAssets", undefined, {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
    });
    throw new Error(`Failed to fetch assets: ${response.status}`);
  }

  const data = await response.json();
  
  // CDA returns assets in an array or wrapped in { assets: [...] }
  let assets: ContentstackAsset[] = [];
  if (Array.isArray(data)) {
    assets = data;
  } else if (data.assets && Array.isArray(data.assets)) {
    assets = data.assets;
  } else if (data.asset) {
    // Single asset wrapped
    assets = [data.asset];
  }

  // If query filter was provided, Contentstack should have already filtered
  // But we still need to ensure we only return assets with art_metadata
  let filteredAssets = assets.filter((asset) => {
    const artMetadata = asset.custom_metadata?.art_metadata;
    
    // Only return assets with art_metadata
    if (!artMetadata) {
      return false;
    }

    // If query filter was not provided, apply client-side filters for backward compatibility
    if (!options?.query) {
      // Filter by category if provided
      if (options?.category && artMetadata.category !== options.category) {
        return false;
      }

      // Filter by artist if provided
      if (options?.artistId && artMetadata.artist_uid !== options.artistId) {
        return false;
      }
    }

    return true;
  });

  return filteredAssets;
}

/**
 * Get all unique artists from user collections
 * Returns artist information with artwork count and total sales
 * More efficient than fetching all assets - uses Firestore user data
 */
export async function getArtists(): Promise<
  Array<{
    id: string;
    name: string;
    artworks: number;
    totalSales: number;
  }>
> {
  // Import Firebase admin functions
  const { getAllArtists, getUserAssets } = await import("@/lib/firebase-admin");
  
  // Get all users with artist role from Firestore
  const artistUsers = await getAllArtists();
  
  if (artistUsers.length === 0) {
    return [];
  }

  // For each artist, get their assets and calculate stats
  const artistPromises = artistUsers.map(async (artistUser: any) => {
    const artistId = artistUser.id;
    const artistName = artistUser.displayName || artistUser.email || "Unknown Artist";
    
    // Get artist's asset collection from Firestore
    const userAssets = await getUserAssets(artistId);
    const assetUids = (userAssets.assets || []).map((asset: any) => asset.assetUid);
    
    if (assetUids.length === 0) {
      return {
        id: artistId,
        name: artistName,
        artworks: 0,
        totalSales: 0,
      };
    }

    // Fetch asset details from Contentstack to get prices and status
    const assetDetailsPromises = assetUids.map((assetUid: string) =>
      getAssetFromCDA(assetUid).catch((error) => {
        log.error(`Failed to fetch asset ${assetUid} for artist ${artistId}`, error);
        return null;
      })
    );

    const assetDetails = await Promise.all(assetDetailsPromises);
    const validAssets = assetDetails.filter((asset) => asset !== null) as ContentstackAsset[];

    // Calculate stats
    let artworks = 0;
    let totalSales = 0;

    validAssets.forEach((asset) => {
      const artMetadata = asset.custom_metadata?.art_metadata;
      
      // Count all artworks (not just sold ones)
      artworks += 1;
      
      // Only count sales if artwork is sold
      if (artMetadata?.status === "sold" && artMetadata?.price) {
        totalSales += artMetadata.price;
      }
    });

    return {
      id: artistId,
      name: artistName,
      artworks,
      totalSales,
    };
  });

  const artists = await Promise.all(artistPromises);

  // Filter out artists with no artworks and sort by total sales (descending)
  return artists
    .filter((artist) => artist.artworks > 0)
    .sort((a, b) => b.totalSales - a.totalSales);
}

/**
 * Trigger Contentstack Automation API (async, non-blocking)
 * This function fires and forgets - it doesn't wait for the response
 */
export async function triggerContentstackAutomation(
  assetUid: string
): Promise<void> {
  const automationUrl = `${publishAutomationApiUrl}?asset=${assetUid}`;
  log.debug("Triggering Contentstack Automation", { automationUrl, assetUid });
  // Fire and forget - don't await, don't block
  fetch(automationUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        log.error(
          `[Automation API] Failed to trigger automation for asset ${assetUid}`,
          undefined,
          {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
          }
        );
      } else {
        const data = await response.json().catch(() => null);
        log.info(
          `[Automation API] Successfully triggered automation for asset ${assetUid}`,
          { assetUid, response: data }
        );
      }
    })
    .catch((error) => {
      // Silently log errors - don't throw, this is non-blocking
      log.error(
        `[Automation API] Error triggering automation for asset ${assetUid}`,
        error
      );
    });
}
