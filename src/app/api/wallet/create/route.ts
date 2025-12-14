import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase-admin";
import { adminDb } from "@/lib/firebase-admin";
import { createWalletSchema } from "@/lib/validations";
import { FieldValue } from "firebase-admin/firestore";
import { log } from "@/lib/logger";

/**
 * POST /api/wallet/create
 * Create a new wallet for a user (called on signup)
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

    const body = await request.json();
    const validation = createWalletSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { userId } = validation.data;

    // Ensure user can only create wallet for themselves
    if (userId !== decodedToken.uid) {
      return NextResponse.json(
        { error: "Cannot create wallet for another user" },
        { status: 403 }
      );
    }

    const db = adminDb();

    // Check if user already has a wallet
    const userDoc = await db.collection("users").doc(userId).get();
    if (userDoc.exists && userDoc.data()?.walletId) {
      return NextResponse.json(
        { error: "Wallet already exists", walletId: userDoc.data()?.walletId },
        { status: 409 }
      );
    }

    // Generate wallet ID
    const walletId = `wallet_${userId}_${Date.now().toString(36)}`;

    // Create wallet document
    await db.collection("wallets").doc(walletId).set({
      userId,
      balance: 0,
      transactions: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Update user document with wallet reference
    await db.collection("users").doc(userId).update({
      walletId,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      walletId,
      message: "Wallet created successfully",
    });
  } catch (error: any) {
    log.error("Wallet creation error", error);
    return NextResponse.json(
      { error: "Failed to create wallet" },
      { status: 500 }
    );
  }
}

