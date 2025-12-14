/**
 * Zod Validation Schemas
 * 
 * Used for API input validation
 */

import { z } from "zod";

// ==========================================
// Authentication Schemas
// ==========================================

export const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and number"
    ),
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name too long"),
  role: z.enum(["buyer", "artist"]).default("buyer"),
});

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ==========================================
// Wallet Schemas
// ==========================================

export const createWalletSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

export const depositSchema = z.object({
  amount: z
    .number()
    .positive("Amount must be positive")
    .max(10000, "Maximum deposit is $10,000"),
});

// ==========================================
// Artwork Schemas
// ==========================================

export const artworkMetadataSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title too long"),
  description: z.string().max(1000, "Description too long").optional(),
  category: z.string().min(1, "Category is required"),
  price: z
    .number()
    .positive("Price must be positive")
    .max(1000000, "Price exceeds maximum"),
  currency: z.string().default("USD"),
  tags: z.array(z.string()).max(10, "Maximum 10 tags allowed").optional(),
});

export const publishArtworkSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(1000).optional(),
  category: z.string().min(1),
  price: z.number().positive().max(1000000),
  tags: z.array(z.string()).max(10).optional(),
});

// ==========================================
// Purchase Schemas
// ==========================================

export const createCheckoutSchema = z.object({
  artworkId: z.string().min(1, "Artwork ID is required"),
});

export const purchaseSchema = z.object({
  assetUid: z.string().min(1, "Asset UID is required"),
  successUrl: z.string().url("Invalid success URL"),
  cancelUrl: z.string().url("Invalid cancel URL"),
});

// ==========================================
// Filter Schemas
// ==========================================

export const galleryFilterSchema = z.object({
  category: z.string().optional(),
  artistId: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  status: z.enum(["sale", "resale", "sold", "all"]).optional(),
  sortBy: z.enum(["newest", "price_asc", "price_desc", "popular"]).optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

// ==========================================
// Contentstack Asset Management 2.0 Schemas
// ==========================================

export const ownerRecordSchema = z.object({
  user_id: z.string().min(1, "User ID is required"),
  user_name: z.string().optional().nullable(),
  purchase_date: z.string().optional().nullable(),
  transaction_id: z.string().min(1, "Transaction ID is required"),
});

export const assetUploadSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title too long"),
  description: z.string().max(1000, "Description too long").optional(),
  category: z.string().min(1, "Category is required"),
  price: z.number().positive("Price must be positive").max(1000000, "Price exceeds maximum"),
  currency: z.string().min(1, "Currency is required").default("USD"),
  status: z.enum(["sold", "sale", "resale"], {
    errorMap: () => ({ message: "Status must be 'sold', 'sale', or 'resale'" }),
  }),
  tags: z.array(z.string()).max(10, "Maximum 10 tags allowed").optional(),
});

export const assetUpdateSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string()).max(10).optional(),
  artist_uid: z.string().optional(),
  artist_name: z.string().optional(),
  price: z.number().positive().max(1000000).optional(),
  currency: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(["sold", "sale", "resale"]).optional(),
  owners: z.array(ownerRecordSchema).optional(),
});

export const addOwnerSchema = z.object({
  user_id: z.string().min(1, "User ID is required"),
  user_name: z.string().optional().nullable(),
  purchase_date: z.string().optional().nullable(),
  transaction_id: z.string().min(1, "Transaction ID is required"),
});

// ==========================================
// Type Exports
// ==========================================

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ArtworkMetadataInput = z.infer<typeof artworkMetadataSchema>;
export type PublishArtworkInput = z.infer<typeof publishArtworkSchema>;
export type PurchaseInput = z.infer<typeof purchaseSchema>;
export type GalleryFilterInput = z.infer<typeof galleryFilterSchema>;
export type AssetUploadInput = z.infer<typeof assetUploadSchema>;
export type AssetUpdateInput = z.infer<typeof assetUpdateSchema>;
export type OwnerRecordInput = z.infer<typeof ownerRecordSchema>;
export type AddOwnerInput = z.infer<typeof addOwnerSchema>;

