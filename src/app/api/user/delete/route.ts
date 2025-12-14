import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, deleteUserByUid, getServerUserProfile, adminDb } from "@/lib/firebase-admin";
import { log } from "@/lib/logger";

/**
 * DELETE /api/user/delete
 * Delete user account (both Firebase Auth and Firestore data)
 * 
 * This endpoint:
 * 1. Deletes the user from Firebase Authentication
 * 2. Deletes user document from Firestore
 * 3. Deletes user's wallet from Firestore
 * 4. Deletes user's asset collection from Firestore
 * 
 * Note: This is a destructive operation and cannot be undone.
 */
export async function DELETE(request: NextRequest) {
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

    // Get user profile to find wallet ID
    const userProfile = await getServerUserProfile(userId);
    const walletId = (userProfile as any)?.walletId;

    const db = adminDb();
    const batch = db.batch();

    try {
      // 1. Delete user document from Firestore
      const userRef = db.collection("users").doc(userId);
      batch.delete(userRef);

      // 2. Delete wallet if it exists
      if (walletId) {
        const walletRef = db.collection("wallets").doc(walletId);
        batch.delete(walletRef);
      }

      // 3. Delete user's asset collection (user_assets subcollection)
      const userAssetsRef = db.collection("users").doc(userId).collection("user_assets");
      const userAssetsSnapshot = await userAssetsRef.get();
      userAssetsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Commit all Firestore deletions
      await batch.commit();
      log.info(`[Delete User] Deleted Firestore data for user`, { userId });

      // 4. Delete user from Firebase Authentication
      await deleteUserByUid(userId);
      log.info(`[Delete User] Deleted Firebase Auth user`, { userId });

      return NextResponse.json({
        success: true,
        message: "User account deleted successfully",
      });
    } catch (error: any) {
      log.error(`[Delete User] Error deleting user`, error, { userId });

      // If Auth deletion fails but Firestore was deleted, that's okay
      // The user can't log in anyway without Auth
      if (error.code === "auth/user-not-found") {
        return NextResponse.json({
          success: true,
          message: "User data deleted (user was already removed from Authentication)",
        });
      }

      throw error;
    }
  } catch (error: any) {
    log.error("[Delete User] Error", error);
    return NextResponse.json(
      {
        error: "Failed to delete user account",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

