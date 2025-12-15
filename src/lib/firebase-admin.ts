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
 * Remove asset from user's collection (server-side)
 * Used when artwork is sold to a new owner
 */
export async function removeUserAsset(userId: string, assetUid: string) {
  try {
    const { FieldValue } = await import("firebase-admin/firestore");
    const db = adminDb();
    
    if (!db) {
      throw new Error("Firebase Admin database not initialized");
    }
    
    const userAssetsRef = db.collection("user_assets").doc(userId);
    const userAssetsDoc = await userAssetsRef.get();
    
    if (!userAssetsDoc.exists) {
      log.debug(`[removeUserAsset] User assets document does not exist`, { userId });
      return; // Nothing to remove
    }
    
    const userAssetsData = userAssetsDoc.data()!;
    const existingAssets = userAssetsData.assets || [];
    
    // Filter out the asset
    const updatedAssets = existingAssets.filter(
      (asset: any) => asset.assetUid !== assetUid
    );
    
    if (updatedAssets.length !== existingAssets.length) {
      // Asset was found and removed
      await userAssetsRef.update({
        assets: updatedAssets,
        updatedAt: FieldValue.serverTimestamp(),
      });
      log.info(`[removeUserAsset] Removed asset from user collection`, { assetUid, userId });
    } else {
      log.debug(`[removeUserAsset] Asset not found in user collection`, { assetUid, userId });
    }
  } catch (error: any) {
    log.error(`[removeUserAsset] Error removing asset from user`, error, {
      assetUid,
      userId,
      code: error.code,
    });
    // Don't throw - this is not critical enough to fail the purchase
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

/**
 * Create an offer for an asset
 */
export async function createOffer(
  assetUid: string,
  offerData: {
    buyerId: string;
    buyerName: string;
    amount: number;
    currency: string;
    message?: string;
  }
) {
  const { FieldValue } = await import("firebase-admin/firestore");
  const db = adminDb();
  
  const offerId = `OFFER_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const offerRef = db.collection("offers").doc(offerId);
  
  const offer = {
    id: offerId,
    assetUid,
    buyerId: offerData.buyerId,
    buyerName: offerData.buyerName,
    amount: offerData.amount,
    currency: offerData.currency,
    message: offerData.message || "",
    status: "pending" as "pending" | "accepted" | "rejected" | "expired",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  
  await offerRef.set(offer);
  
  log.info(`[createOffer] Offer created`, { offerId, assetUid, buyerId: offerData.buyerId });
  
  return { ...offer,id: offerId, };
}

/**
 * Get offers for an asset
 */
export async function getAssetOffers(assetUid: string): Promise<any[]> {
  const db = adminDb();
  const offersRef = db.collection("offers");
  const snapshot = await offersRef
    .where("assetUid", "==", assetUid)
    .where("status", "==", "pending")
    .get();
  
  if (snapshot.empty) {
    return [];
  }
  
  // Map to array and sort by amount (descending)
  const offers = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  
  // Sort by amount in descending order (highest first)
  return offers.sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0));
}

/**
 * Get count of pending offers for an asset
 */
export async function getAssetOffersCount(assetUid: string): Promise<number> {
  const db = adminDb();
  const offersRef = db.collection("offers");
  const snapshot = await offersRef
    .where("assetUid", "==", assetUid)
    .where("status", "==", "pending")
    .get();
  
  return snapshot.size;
}

/**
 * Get accepted offer for an asset (if any)
 * Optionally filter by buyerId to get accepted offer for a specific buyer
 */
export async function getAcceptedOffer(
  assetUid: string,
  buyerId?: string
): Promise<{
  id: string;
  assetUid: string;
  buyerId: string;
  buyerName: string;
  amount: number;
  currency: string;
  message?: string;
  status: "accepted";
  createdAt: any;
  updatedAt?: any;
  acceptedAt?: any;
  acceptedBy?: string;
} | null> {
  const db = adminDb();
  const offersRef = db.collection("offers");
  
  let query = offersRef
    .where("assetUid", "==", assetUid)
    .where("status", "==", "accepted");
  
  // If buyerId is provided, filter by it to get the specific buyer's accepted offer
  if (buyerId) {
    query = query.where("buyerId", "==", buyerId) as any;
  }
  
  const snapshot = await query.limit(1).get();
  
  log.info(`[getAcceptedOffer] Query result`, {
    assetUid,
    buyerId,
    empty: snapshot.empty,
    size: snapshot.size,
  });
  
  if (snapshot.empty) {
    return null;
  }
  
  const doc = snapshot.docs[0];
  const data = doc.data() as any;
  
  log.info(`[getAcceptedOffer] Found offer`, {
    id: doc.id,
    buyerId: data.buyerId,
    status: data.status,
    assetUid: data.assetUid,
  });
  
  return {
    id: doc.id,
    ...data,
  };
}

/**
 * Update offer status (accept or reject)
 */
export async function updateOfferStatus(
  offerId: string,
  status: "accepted" | "rejected",
  ownerId: string
) {
  const { FieldValue } = await import("firebase-admin/firestore");
  const db = adminDb();
  const offerRef = db.collection("offers").doc(offerId);
  
  const offerDoc = await offerRef.get();
  if (!offerDoc.exists) {
    throw new Error("Offer not found");
  }
  
  const offerData = offerDoc.data()!;
  
  // Verify the offer is still pending
  if (offerData.status !== "pending") {
    throw new Error(`Offer is already ${offerData.status}`);
  }
  
  await offerRef.update({
    status,
    updatedAt: FieldValue.serverTimestamp(),
    ...(status === "accepted" ? { acceptedBy: ownerId, acceptedAt: FieldValue.serverTimestamp() } : {}),
  });
  
  // If accepted, reject all other pending offers for the same asset
  if (status === "accepted") {
    // Query without != operator to avoid requiring an index
    // We'll filter out the accepted offer in memory
    const allPendingOffersSnapshot = await db.collection("offers")
      .where("assetUid", "==", offerData.assetUid)
      .where("status", "==", "pending")
      .get();
    
    // Filter out the accepted offer
    const otherOffers = allPendingOffersSnapshot.docs.filter(
      (doc) => doc.id !== offerId
    );
    
    if (otherOffers.length > 0) {
      const batch = db.batch();
      otherOffers.forEach((doc) => {
        batch.update(doc.ref, {
          status: "rejected",
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
      
      await batch.commit();
      log.info(`[updateOfferStatus] Rejected ${otherOffers.length} other pending offers`);
    }
  }
  
  log.info(`[updateOfferStatus] Offer ${status}`, { offerId, assetUid: offerData.assetUid });
  
  return { ...offerData, id: offerId, status };
}

