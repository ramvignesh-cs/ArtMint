import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, getServerUserProfile, getServerWallet } from "@/lib/firebase-admin";
import { log } from "@/lib/logger";

/**
 * GET /api/wallet/ledger
 * Get transaction history for authenticated user's wallet
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

    // Get user profile to find wallet ID
    const profile = await getServerUserProfile(decodedToken.uid);

    if (!profile?.walletId) {
      return NextResponse.json(
        { error: "No wallet found for user" },
        { status: 404 }
      );
    }

    // Get wallet data
    const wallet = await getServerWallet(profile.walletId);

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    // Return wallet data with transactions
    return NextResponse.json({
      walletId: wallet.id,
      balance: wallet.balance || 0,
      transactions: wallet.transactions || [],
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    });
  } catch (error: any) {
    log.error("Ledger fetch error", error);
    return NextResponse.json(
      { error: "Failed to fetch wallet ledger" },
      { status: 500 }
    );
  }
}

