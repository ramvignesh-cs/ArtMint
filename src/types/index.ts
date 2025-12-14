/**
 * Global type definitions for ArtMint
 */

// User types
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: "buyer" | "artist";
  walletId: string;
  photoURL?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Wallet types
export interface Transaction {
  id: string;
  type: "DEBIT" | "CREDIT";
  amount: number;
  timestamp: string;
  reference: {
    assetUid?: string;
    stripePaymentId?: string;
    description?: string;
  };
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  transactions: Transaction[];
  createdAt: string;
  updatedAt: string;
}

// Artwork types
export interface ArtworkMetadata {
  title: string;
  description?: string;
  category: string;
  artistId: string;
  artistName: string;
  price: number;
  currency: string;
  status: "draft" | "published" | "sold";
  owners: OwnerRecord[];
  createdAt: string;
  tags?: string[];
}

export interface OwnerRecord {
  userId: string;
  userName?: string;
  purchaseDate: string;
  transactionId: string;
}

export interface Artwork {
  uid: string;
  title: string;
  filename: string;
  url: string;
  content_type: string;
  file_size: number;
  created_at: string;
  updated_at: string;
  metadata?: ArtworkMetadata;
  dimension?: {
    width: number;
    height: number;
  };
}

// API Response types
export interface ApiResponse<T = unknown> {
  success?: boolean;
  error?: string;
  message?: string;
  data?: T;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}

// Gallery Filter types
export interface GalleryFilters {
  category?: string;
  artistId?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: "newest" | "price_asc" | "price_desc" | "popular";
  page?: number;
  limit?: number;
}

// Artist types
export interface Artist {
  id: string;
  name: string;
  bio?: string;
  artworks: number;
  totalSales: number;
  avatar?: string | null;
}

