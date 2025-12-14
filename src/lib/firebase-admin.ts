import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { DocumentSnapshot, getFirestore } from "firebase-admin/firestore";
import { log } from "@/lib/logger";
import { UserProfile } from "../types";

/**
 * Firebase Admin SDK for server-side operations
 * Used for:
 * - Verifying ID tokens
 * - Server-side Firestore operations
 * - User management
 */

let adminApp: App;

function getAdminApp(): App {
  if (getApps().length === 0) {
    // Service account can be provided as base64-encoded JSON
    const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (serviceAccountBase64) {
      try {
        const serviceAccount = JSON.parse(
          Buffer.from(serviceAccountBase64, "base64").toString("utf-8")
        );

        adminApp = initializeApp({
          credential: cert(serviceAccount),
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      } catch (error) {
        log.error(
          "Failed to parse FIREBASE_SERVICE_ACCOUNT",
          error instanceof Error ? error : undefined
        );
        throw new Error(
          "Invalid FIREBASE_SERVICE_ACCOUNT. Please check your environment variable."
        );
      }
    } else {
      // Check if we're in development and using emulator
      const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true";
      
      if (useEmulator) {
        // For Firebase Emulator, we can initialize without credentials
        adminApp = initializeApp({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project",
        });
      } else {
        // Production/development without emulator requires service account
        throw new Error(
          "FIREBASE_SERVICE_ACCOUNT environment variable is required. " +
          "Please set it to a base64-encoded Firebase service account JSON. " +
          "Or set NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true to use the Firebase Emulator."
        );
      }
    }
  } else {
    adminApp = getApps()[0];
  }

  return adminApp;
}

export const adminAuth = () => getAuth(getAdminApp());
export const adminDb = () => getFirestore(getAdminApp());

/**
 * Verify Firebase ID token from request headers
 */
export async function verifyIdToken(token: string) {
  try {
    const decodedToken = await adminAuth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    log.error("Error verifying ID token", error);
    return null;
  }
}

/**
 * Get user profile from Firestore (server-side)
 */
export async function getServerUserProfile(uid: string) {
  const userDoc = await adminDb().collection("users").doc(uid).get() as DocumentSnapshot<UserProfile>;
  if (!userDoc.exists) return null;
  return { id: userDoc.id, ...userDoc.data() };
}

/**
 * Get wallet by ID (server-side)
 */
export async function getServerWallet(walletId: string) {
  const walletDoc = await adminDb().collection("wallets").doc(walletId).get();
  if (!walletDoc.exists) return null;
  return { id: walletDoc.id, ...walletDoc.data() };
}

/**
 * Add transaction to wallet (server-side, for webhook processing)
 */
export async function addServerTransaction(
  walletId: string,
  transaction: {
    id: string;
    type: "DEBIT" | "CREDIT";
    amount: number;
    reference: {
      assetUid?: string;
      stripePaymentId?: string;
      description?: string;
    };
  }
) {
  const walletRef = adminDb().collection("wallets").doc(walletId);
  const walletDoc = await walletRef.get();

  if (!walletDoc.exists) {
    throw new Error("Wallet not found");
  }

  const walletData = walletDoc.data()!;
  const currentBalance = walletData.balance || 0;
  const newBalance =
    transaction.type === "CREDIT"
      ? currentBalance + transaction.amount
      : currentBalance - transaction.amount;

  // Use Firestore arrayUnion for immutable append
  const { FieldValue } = await import("firebase-admin/firestore");

  await walletRef.update({
    balance: newBalance,
    transactions: FieldValue.arrayUnion({
      ...transaction,
      timestamp: new Date().toISOString(),
    }),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { newBalance };
}

/**
 * Add asset to user's collection (server-side, for webhook processing)
 */
export async function addUserAsset(
  userId: string,
  assetUid: string,
  purchaseData: {
    transactionId: string;
    purchaseDate: string;
    price: number;
    currency: string;
  }
) {
  try {
    const { FieldValue } = await import("firebase-admin/firestore");
    const db = adminDb();
    
    if (!db) {
      throw new Error("Firebase Admin database not initialized");
    }
    
    const userAssetsRef = db.collection("user_assets").doc(userId);
    
    log.debug(`[addUserAsset] Adding asset to user`, { assetUid, userId });
    
    // Get or create user assets document
    const userAssetsDoc = await userAssetsRef.get();
    
    const now = FieldValue.serverTimestamp();
    // Note: FieldValue.serverTimestamp() cannot be used inside arrays
    // So we use a regular timestamp for addedAt in the asset object
    const addedAtTimestamp = new Date().toISOString();
    const newAsset = {
      assetUid,
      transactionId: purchaseData.transactionId,
      purchaseDate: purchaseData.purchaseDate,
      price: purchaseData.price,
      currency: purchaseData.currency,
      addedAt: addedAtTimestamp, // Use ISO string instead of FieldValue
    };
    
    if (!userAssetsDoc.exists) {
      // Create new document
      log.debug(`[addUserAsset] Creating new user_assets document`, { userId });
      await userAssetsRef.set({
        userId,
        assets: [newAsset],
        createdAt: now,
        updatedAt: now,
      });
      log.info(`[addUserAsset] Successfully created user_assets document`, { userId });
    } else {
      // Check if asset already exists
      const userAssetsData = userAssetsDoc.data()!;
      const existingAssets = userAssetsData.assets || [];
      
      // Only add if not already in collection
      const assetExists = existingAssets.some(
        (asset: any) => asset.assetUid === assetUid
      );
      
      if (!assetExists) {
        // Read current assets, append new one, and update
        log.debug(`[addUserAsset] Adding asset to existing user_assets document`, { userId });
        const updatedAssets = [...existingAssets, newAsset];
        await userAssetsRef.update({
          assets: updatedAssets,
          updatedAt: now,
        });
        log.info(`[addUserAsset] Successfully updated user_assets document`, { userId });
      } else {
        log.debug(`[addUserAsset] Asset already exists in user collection`, { assetUid, userId });
      }
    }
  } catch (error: any) {
    log.error(`[addUserAsset] Error adding asset to user`, error, {
      assetUid,
      userId,
      code: error.code,
    });
    throw error; // Re-throw to ensure caller knows it failed
  }
}

/**
 * Get user's asset collection (server-side)
 */
export async function getUserAssets(userId: string) {
  const userAssetsDoc = await adminDb().collection("user_assets").doc(userId).get();
  
  if (!userAssetsDoc.exists) {
    return { assets: [] };
  }
  
  const data = userAssetsDoc.data()!;
  return {
    assets: data.assets || [],
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/**
 * Get all users with artist role (server-side)
 */
export async function getAllArtists() {
  const usersRef = adminDb().collection("users");
  const snapshot = await usersRef.where("role", "==", "artist").get();
  
  if (snapshot.empty) {
    return [];
  }
  
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Delete a user from Firebase Authentication by email
 * This is useful when a user was deleted from Firestore but still exists in Auth
 */
export async function deleteUserByEmail(email: string) {
  try {
    const auth = getAuth(getAdminApp());
    
    // Find user by email
    const userRecord = await auth.getUserByEmail(email);
    
    // Delete the user from Authentication
    await auth.deleteUser(userRecord.uid);
    
    log.info(`Successfully deleted user from Firebase Authentication`, { uid: userRecord.uid, email });
    return { success: true, uid: userRecord.uid, email };
  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      log.warn(`User with email not found in Firebase Authentication`, { email });
      return { success: false, error: "User not found in Authentication" };
    }
    log.error(`Error deleting user by email`, error, { email });
    throw error;
  }
}

/**
 * Delete a user from Firebase Authentication by UID
 */
export async function deleteUserByUid(uid: string) {
  try {
    const auth = getAuth(getAdminApp());
    await auth.deleteUser(uid);
    log.info(`Successfully deleted user from Firebase Authentication`, { uid });
    return { success: true, uid };
  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      log.warn(`User with UID not found in Firebase Authentication`, { uid });
      return { success: false, error: "User not found in Authentication" };
    }
    log.error(`Error deleting user`, error, { uid });
    throw error;
  }
}

