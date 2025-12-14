import { NextRequest, NextResponse } from "next/server";
import { getArtists } from "@/lib/contentstack-am2";
import { log } from "@/lib/logger";

/**
 * GET /api/artists
 * Get all artists from Contentstack assets
 */
export async function GET(request: NextRequest) {
  try {
    const artists = await getArtists();

    return NextResponse.json({
      success: true,
      artists,
      total: artists.length,
    });
  } catch (error: any) {
    log.error("Get artists error", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch artists" },
      { status: 500 }
    );
  }
}

