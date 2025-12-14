import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, getServerUserProfile } from "@/lib/firebase-admin";
import { uploadAsset } from "@/lib/contentstack-am2";
import { publishArtworkSchema } from "@/lib/validations";
import { log } from "@/lib/logger";

/**
 * POST /api/artworks/publish
 * Upload and publish a new artwork (artists only)
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
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    if ((profile as any).role !== "artist") {
      return NextResponse.json(
        { error: "Only artists can publish artworks" },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const category = formData.get("category") as string;
    const price = parseFloat(formData.get("price") as string);
    const tagsJson = formData.get("tags") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate artwork data
    const validation = publishArtworkSchema.safeParse({
      title,
      description,
      category,
      price,
      tags: tagsJson ? JSON.parse(tagsJson) : [],
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid artwork data", details: validation.error.errors },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Contentstack Asset Management 2.0
    const asset = await uploadAsset({
      file: buffer,
      filename: file.name,
      mimeType: file.type,
      artist_uid: decodedToken.uid,
      artist_name: (profile as any).displayName || "Unknown Artist",
      price: validation.data.price,
      currency: "USD",
      category: validation.data.category,
      status: "sale",
      title: validation.data.title,
      description: validation.data.description,
      tags: validation.data.tags || [],
    });

    return NextResponse.json({
      success: true,
      assetUid: asset.uid,
      message: "Artwork published successfully",
    });
  } catch (error: any) {
    log.error("Artwork publish error", error);
    return NextResponse.json(
      { error: "Failed to publish artwork" },
      { status: 500 }
    );
  }
}

