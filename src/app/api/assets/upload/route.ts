import { NextRequest, NextResponse } from "next/server";
import {
  verifyIdToken,
  getServerUserProfile,
  addUserAsset,
} from "@/lib/firebase-admin";
import {
  uploadAsset,
  triggerContentstackAutomation,
  toMinimalAssetResponse,
  getAssetUsingAMV2API,
} from "@/lib/contentstack-am2";
import { assetUploadSchema } from "@/lib/validations";

/**
 * POST /api/assets/upload
 * Upload a new asset to Contentstack Asset Management 2.0
 *
 * Required fields:
 * - file: The asset file to upload
 * - artist_uid: Firebase user ID of the artist
 * - artist_name: Name of the artist
 * - price: Price of the artwork
 * - currency: Currency code (e.g., "USD")
 * - category: Category of the artwork
 * - status: "sold" | "sale" | "resale"
 *
 * Optional fields:
 * - title: Custom title (defaults to filename)
 * - description: Description of the artwork
 * - tags: Array of tags
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

    // Get user profile and verify artist role
    const profile = await getServerUserProfile(decodedToken.uid);

    if (!profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    if ((profile as any).role !== "artist") {
      return NextResponse.json(
        { error: "Only artists can upload assets" },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;
    const category = formData.get("category") as string | null;
    const priceStr = formData.get("price") as string | null;
    const currency = formData.get("currency") as string | null;
    const status = formData.get("status") as string | null;
    const tagsJson = formData.get("tags") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Parse and validate input
    const price = priceStr ? parseFloat(priceStr) : null;
    const tags = tagsJson ? JSON.parse(tagsJson) : [];

    const validation = assetUploadSchema.safeParse({
      title: title || file.name,
      description: description || undefined,
      category: category || undefined,
      price: price || undefined,
      currency: currency || "USD",
      status: status || undefined,
      tags: tags.length > 0 ? tags : undefined,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid asset data", details: validation.error.errors },
        { status: 400 }
      );
    }

    const validated = validation.data;

    // Convert file to buffer for Node.js
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Contentstack Asset Management 2.0
    const asset = await uploadAsset({
      file: buffer,
      filename: file.name,
      mimeType: file.type,
      artist_uid: decodedToken.uid,
      artist_name: (profile as any).displayName || "Unknown Artist",
      price: validated.price,
      currency: validated.currency,
      category: validated.category,
      status: validated.status as "sold" | "sale" | "resale",
      title: validated.title,
      description: validated.description,
      tags: validated.tags,
    });

    // Add asset to artist's collection (as creator/owner)
    try {
      log.debug(
        `[Upload] Adding asset to artist collection`,
        { assetUid: asset.uid, userId: decodedToken.uid }
      );
      await addUserAsset(decodedToken.uid, asset.uid, {
        transactionId: "CREATOR",
        purchaseDate: asset.created_at,
        price: validated.price,
        currency: validated.currency,
      });
      log.info(
        `[Upload] Successfully added asset to artist collection`,
        { assetUid: asset.uid }
      );
    } catch (error: any) {
      log.error(
        "[Upload] Failed to add asset to artist collection",
        error,
        { assetUid: asset.uid, userId: decodedToken.uid }
      );
      // Don't fail the upload if collection update fails, but log it clearly
      // The asset is still uploaded to Contentstack, just not tracked in Firestore
    }

    // Trigger Contentstack Automation API (async, non-blocking)
    triggerContentstackAutomation(asset.uid);

    // Return only required fields for UI
    const minimalAsset = toMinimalAssetResponse(asset);

    return NextResponse.json({
      success: true,
      notice: "Asset created successfully",
      asset: minimalAsset,
    });
  } catch (error: any) {
    log.error("Asset upload error", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload asset" },
      { status: 500 }
    );
  }
}
