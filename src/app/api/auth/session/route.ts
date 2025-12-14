import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, getServerUserProfile } from "@/lib/firebase-admin";
import { log } from "@/lib/logger";

/**
 * GET /api/auth/session
 * Verify and return current user session
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "No authorization token provided" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await verifyIdToken(token);

    if (!decodedToken) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Get user profile from Firestore
    const profile = await getServerUserProfile(decodedToken.uid);

    return NextResponse.json({
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        ...profile,
      },
    });
  } catch (error: any) {
    log.error("Session verification error", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 401 }
    );
  }
}

