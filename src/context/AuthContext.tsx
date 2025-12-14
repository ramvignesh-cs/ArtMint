"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { User } from "firebase/auth";
import { log } from "@/lib/logger";
import {
  onAuthChange,
  getUserProfile,
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signInWithApple,
  logOut,
  getWalletByUserId,
} from "@/lib/firebase";

// ==========================================
// Types
// ==========================================

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: "buyer" | "artist";
  walletId: string;
  photoURL?: string;
  createdAt?: string;
}

interface WalletData {
  id: string;
  balance: number;
  transactions: Array<{
    id: string;
    type: "DEBIT" | "CREDIT";
    amount: number;
    timestamp: string;
    reference: {
      assetUid?: string;
      stripePaymentId?: string;
      description?: string;
    };
  }>;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  wallet: WalletData | null;
  loading: boolean;
  error: string | null;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    role?: "buyer" | "artist"
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInGoogle: (role?: "buyer" | "artist") => Promise<void>;
  signInApple: (role?: "buyer" | "artist") => Promise<void>;
  logout: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ==========================================
// Context
// ==========================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ==========================================
// Provider
// ==========================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user profile and wallet
  const fetchUserData = useCallback(async (uid: string) => {
    try {
      const userProfile = await getUserProfile(uid);
      if (userProfile) {
        setProfile(userProfile as UserProfile);

        // Fetch wallet data
        const walletData = await getWalletByUserId(uid);
        if (walletData) {
          setWallet(walletData as WalletData);
        }
      }
    } catch (err) {
      log.error("Error fetching user data", err);
      setError("Failed to load user data");
    }
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        await fetchUserData(firebaseUser.uid);
      } else {
        setProfile(null);
        setWallet(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchUserData]);

  // Sign up with email
  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    role: "buyer" | "artist" = "buyer"
  ) => {
    setError(null);
    setLoading(true);
    try {
      await signUpWithEmail(email, password, displayName, role);
    } catch (err: any) {
      setError(err.message || "Sign up failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign in with email
  const signIn = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      await signInWithEmail(email, password);
    } catch (err: any) {
      setError(err.message || "Sign in failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign in with Google
  const signInGoogle = async (role: "buyer" | "artist" = "buyer") => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle(role);
    } catch (err: any) {
      setError(err.message || "Google sign in failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign in with Apple
  const signInApple = async (role: "buyer" | "artist" = "buyer") => {
    setError(null);
    setLoading(true);
    try {
      await signInWithApple(role);
    } catch (err: any) {
      setError(err.message || "Apple sign in failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    setError(null);
    try {
      await logOut();
      setProfile(null);
      setWallet(null);
    } catch (err: any) {
      setError(err.message || "Logout failed");
      throw err;
    }
  };

  // Refresh wallet data
  const refreshWallet = async () => {
    if (!user) return;
    try {
      const walletData = await getWalletByUserId(user.uid);
      if (walletData) {
        setWallet(walletData as WalletData);
      }
    } catch (err) {
      log.error("Error refreshing wallet", err);
    }
  };

  // Refresh profile data
  const refreshProfile = async () => {
    if (!user) return;
    await fetchUserData(user.uid);
  };

  const value: AuthContextType = {
    user,
    profile,
    wallet,
    loading,
    error,
    signUp,
    signIn,
    signInGoogle,
    signInApple,
    logout,
    refreshWallet,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ==========================================
// Hook
// ==========================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// ==========================================
// Protected Route Helper
// ==========================================

export function useRequireAuth(redirectTo = "/login") {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = redirectTo;
    }
  }, [user, loading, redirectTo]);

  return { user, loading };
}

export function useRequireRole(
  requiredRole: "buyer" | "artist",
  redirectTo = "/"
) {
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && profile && profile.role !== requiredRole) {
      window.location.href = redirectTo;
    }
  }, [profile, loading, requiredRole, redirectTo]);

  return { profile, loading };
}

