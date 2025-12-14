"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Eye, User } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Asset, ArtworkMetadata } from "@/lib/contentstack";

interface ArtCardProps {
  artwork: Asset;
  index?: number;
}

export function ArtCard({ artwork, index = 0 }: ArtCardProps) {
  const metadata = artwork.metadata as ArtworkMetadata | undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Link href={`/art/${artwork.uid}`} className="block group">
        <div className="art-card gradient-border bg-gallery-card">
          {/* Image Container */}
          <div className="relative aspect-square overflow-hidden rounded-t-xl">
            <Image
              src={artwork.url}
              alt={artwork.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              unoptimized
            />

            {/* Overlay on Hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-gallery-dark/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                <button className="p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-mint-500/20 transition-colors">
                  <Heart className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-mint-500/20 transition-colors">
                  <Eye className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Status Badge */}
            {metadata?.status === "sold" && (
              <div className="absolute top-3 right-3">
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-mint-500/90 text-gallery-dark">
                  Sold
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4 space-y-3">
            {/* Title */}
            <h3 className="font-semibold text-lg truncate group-hover:text-mint-500 transition-colors">
              {artwork.title || metadata?.title || "Untitled"}
            </h3>

            {/* Artist */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span className="truncate">
                {metadata?.artistName || "Unknown Artist"}
              </span>
            </div>

            {/* Price and Category */}
            <div className="flex items-center justify-between">
              <span className="text-mint-500 font-bold text-lg">
                {metadata?.price
                  ? formatCurrency(metadata.price, metadata.currency || "USD")
                  : "Not for sale"}
              </span>
              {metadata?.category && (
                <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                  {metadata.category}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// Skeleton loading state
export function ArtCardSkeleton() {
  return (
    <div className="rounded-xl bg-gallery-card border border-border overflow-hidden">
      <div className="aspect-square shimmer" />
      <div className="p-4 space-y-3">
        <div className="h-6 w-3/4 shimmer rounded" />
        <div className="h-4 w-1/2 shimmer rounded" />
        <div className="flex justify-between">
          <div className="h-6 w-1/3 shimmer rounded" />
          <div className="h-6 w-1/4 shimmer rounded" />
        </div>
      </div>
    </div>
  );
}

