import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  Timestamp,
  orderBy,
} from "firebase/firestore";
import { UserProfile } from "../types";

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (prevent re-initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Auth providers
const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider("apple.com");

// Configure Apple provider
appleProvider.addScope("email");
appleProvider.addScope("name");

// ==========================================
// Authentication Functions
// ==========================================

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
  role: "buyer" | "artist" = "buyer"
) {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
  const user = userCredential.user;

  // Update profile with display name
  await updateProfile(user, { displayName });

  // Create user document and wallet
  await createUserProfile(user.uid, {
    email: user.email!,
    displayName,
    role,
  });

  return user;
}

export async function signInWithEmail(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
  return userCredential.user;
}

export async function signInWithGoogle(role: "buyer" | "artist" = "buyer") {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;

  // Check if user exists, if not create profile
  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (!userDoc.exists()) {
    await createUserProfile(user.uid, {
      email: user.email!,
      displayName: user.displayName || "Anonymous",
      role,
      photoURL: user.photoURL,
    });
  }

  return user;
}

export async function signInWithApple(role: "buyer" | "artist" = "buyer") {
  const result = await signInWithPopup(auth, appleProvider);
  const user = result.user;

  // Check if user exists, if not create profile
  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (!userDoc.exists()) {
    await createUserProfile(user.uid, {
      email: user.email!,
      displayName: user.displayName || "Anonymous",
      role,
      photoURL: user.photoURL,
    });
  }

  return user;
}

export async function logOut() {
  await signOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// ==========================================
// User Profile Functions
// ==========================================

interface UserProfileData {
  email: string;
  displayName: string;
  role: "buyer" | "artist";
  photoURL?: string | null;
}

export async function createUserProfile(uid: string, data: UserProfileData) {
  // Generate wallet ID
  const walletId = `wallet_${uid}_${Date.now().toString(36)}`;

  // Create user document
  await setDoc(doc(db, "users", uid), {
    ...data,
    walletId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Create wallet document with initial balance
  await setDoc(doc(db, "wallets", walletId), {
    userId: uid,
    balance: 0,
    transactions: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { walletId };
}

export async function getUserProfile(uid: string) {
  const userDoc = await getDoc(doc(db, "users", uid));
  if (!userDoc.exists()) return null;
  return { id: userDoc.id, ...userDoc.data() };
}

export async function updateUserRole(uid: string, role: "buyer" | "artist") {
  await updateDoc(doc(db, "users", uid), {
    role,
    updatedAt: serverTimestamp(),
  });
}

// ==========================================
// Wallet Functions
// ==========================================

export interface Transaction {
  id: string;
  type: "DEBIT" | "CREDIT";
  amount: number;
  timestamp: Timestamp | Date;
  reference: {
    assetUid?: string;
    stripePaymentId?: string;
    description?: string;
  };
}

export async function getWallet(walletId: string) {
  const walletDoc = await getDoc(doc(db, "wallets", walletId));
  if (!walletDoc.exists()) return null;
  return { id: walletDoc.id, ...walletDoc.data() };
}

export async function getWalletByUserId(uid: string) {
  const userProfile = await getUserProfile(uid) as UserProfile;
  if (!userProfile || !userProfile.walletId) return null;
  return getWallet(userProfile.walletId);
}

/**
 * Add a transaction to the wallet ledger (append-only)
 * This function ensures immutability by only appending
 */
export async function addTransaction(
  walletId: string,
  transaction: Omit<Transaction, "timestamp">
) {
  const walletRef = doc(db, "wallets", walletId);
  const walletDoc = await getDoc(walletRef);

  if (!walletDoc.exists()) {
    throw new Error("Wallet not found");
  }

  const currentBalance = walletDoc.data().balance || 0;
  const newBalance =
    transaction.type === "CREDIT"
      ? currentBalance + transaction.amount
      : currentBalance - transaction.amount;

  if (transaction.type === "DEBIT" && newBalance < 0) {
    throw new Error("Insufficient balance");
  }

  // Append transaction (immutable ledger pattern)
  await updateDoc(walletRef, {
    balance: newBalance,
    transactions: arrayUnion({
      ...transaction,
      timestamp: new Date().toISOString(),
    }),
    updatedAt: serverTimestamp(),
  });

  return { newBalance, transaction };
}

/**
 * Credit wallet (add funds)
 */
export async function creditWallet(
  walletId: string,
  amount: number,
  reference: Transaction["reference"]
) {
  const transactionId = `tx_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`.toUpperCase();

  return addTransaction(walletId, {
    id: transactionId,
    type: "CREDIT",
    amount,
    reference,
  });
}

/**
 * Debit wallet (purchase)
 */
export async function debitWallet(
  walletId: string,
  amount: number,
  reference: Transaction["reference"]
) {
  const transactionId = `tx_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`.toUpperCase();

  return addTransaction(walletId, {
    id: transactionId,
    type: "DEBIT",
    amount,
    reference,
  });
}

export { auth, db, app };

