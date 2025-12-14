"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { log } from "@/lib/logger";
import { Search, SlidersHorizontal, Grid, LayoutGrid, X } from "lucide-react";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { ArtCard, ArtCardSkeleton } from "@/components/shared/ArtCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Asset } from "@/lib/contentstack";

export default function GalleryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize state from URL params
  const [artworks, setArtworks] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "All");
  const [selectedStatus, setSelectedStatus] = useState<"sale" | "resale" | "sold" | "all">(
    (searchParams.get("status") as "sale" | "resale" | "sold" | "all") || "all"
  );
  const [minPrice, setMinPrice] = useState<string>(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState<string>(searchParams.get("maxPrice") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "newest");
  const [gridCols, setGridCols] = useState<2 | 3 | 4>(3);
  const [categories, setCategories] = useState<string[]>(["All"]);
  
  // Debounced price values for API calls
  const [debouncedMinPrice, setDebouncedMinPrice] = useState<string>(searchParams.get("minPrice") || "");
  const [debouncedMaxPrice, setDebouncedMaxPrice] = useState<string>(searchParams.get("maxPrice") || "");
  
  // Track if we're updating from URL (to prevent loops)
  const isUpdatingFromURL = useRef(false);

  // Update URL query parameters
  const updateURLParams = useCallback((updates: Record<string, string | null>) => {
    if (isUpdatingFromURL.current) return; // Don't update URL if we're syncing from URL
    
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "" || value === "All" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    // Update URL without page reload
    router.push(`/gallery?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Debounce price inputs
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedMinPrice(minPrice);
      updateURLParams({ minPrice: minPrice || null });
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [minPrice, updateURLParams]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedMaxPrice(maxPrice);
      updateURLParams({ maxPrice: maxPrice || null });
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [maxPrice, updateURLParams]);

  // Update URL when filters change (user actions)
  useEffect(() => {
    if (isUpdatingFromURL.current) return;
    
    updateURLParams({
      search: searchTerm || null,
      category: selectedCategory !== "All" ? selectedCategory : null,
      status: selectedStatus !== "all" ? selectedStatus : null,
      sortBy: sortBy !== "newest" ? sortBy : null,
    });
  }, [searchTerm, selectedCategory, selectedStatus, sortBy, updateURLParams]);

  // Sync state from URL params (for browser back/forward navigation)
  useEffect(() => {
    isUpdatingFromURL.current = true;
    
    const urlSearch = searchParams.get("search") || "";
    const urlCategory = searchParams.get("category") || "All";
    const urlStatus = (searchParams.get("status") as "sale" | "resale" | "sold" | "all") || "all";
    const urlSortBy = searchParams.get("sortBy") || "newest";
    const urlMinPrice = searchParams.get("minPrice") || "";
    const urlMaxPrice = searchParams.get("maxPrice") || "";
    
    // Only update state if URL params differ from current state
    if (urlSearch !== searchTerm) setSearchTerm(urlSearch);
    if (urlCategory !== selectedCategory) setSelectedCategory(urlCategory);
    if (urlStatus !== selectedStatus) setSelectedStatus(urlStatus);
    if (urlSortBy !== sortBy) setSortBy(urlSortBy);
    if (urlMinPrice !== minPrice) setMinPrice(urlMinPrice);
    if (urlMaxPrice !== maxPrice) setMaxPrice(urlMaxPrice);
    if (urlMinPrice !== debouncedMinPrice) setDebouncedMinPrice(urlMinPrice);
    if (urlMaxPrice !== debouncedMaxPrice) setDebouncedMaxPrice(urlMaxPrice);
    
    setTimeout(() => {
      isUpdatingFromURL.current = false;
    }, 100);
  }, [searchParams]);

  useEffect(() => {
    const fetchArtworks = async () => {
      setLoading(true);
      try {
        // Build params from current URL search params (which are synced with state)
        const params = new URLSearchParams();
        
        // Add filters from URL params (which are synced with state)
        const category = searchParams.get("category");
        const status = searchParams.get("status");
        const minPriceParam = searchParams.get("minPrice");
        const maxPriceParam = searchParams.get("maxPrice");
        const search = searchParams.get("search");
        const sortByParam = searchParams.get("sortBy") || "newest";
        
        if (category) params.set("category", category);
        if (status) params.set("status", status);
        if (minPriceParam) params.set("minPrice", minPriceParam);
        if (maxPriceParam) params.set("maxPrice", maxPriceParam);
        if (search) params.set("search", search);
        params.set("sortBy", sortByParam);
        params.set("limit", "100"); // Fetch more artworks (max allowed)

        const response = await fetch(`/api/artworks/list?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch artworks");
        }

        setArtworks(data.artworks || []);
        
        // Update categories from API response
        if (data.filters?.categories) {
          setCategories(data.filters.categories);
        }
      } catch (error: any) {
        log.error("Error fetching artworks", error);
        // Fallback to empty array on error
        setArtworks([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      fetchArtworks();
    }, searchTerm ? 500 : 0); // 500ms delay for search, immediate for other filters

    return () => clearTimeout(timeoutId);
  }, [searchParams, searchTerm]); // Refetch when URL params change

  // No need for client-side filtering - API handles it
  const filteredArtworks = artworks;

  return (
    <div className="min-h-screen bg-gallery-dark">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Discover <span className="text-mint-500">Art</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl">
              Explore unique digital artworks from talented artists around the
              world. Find your next masterpiece.
            </p>
          </motion.div>

          {/* Filters - Single Row Layout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            {/* Main Filter Row - All in one line */}
            <div className="flex flex-col lg:flex-row gap-3 mb-4 items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search artworks or artists..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-9 h-9"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <Select value={selectedStatus} onValueChange={(value: any) => setSelectedStatus(value)}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="sale">For Sale</SelectItem>
                  <SelectItem value="resale">Resale</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                </SelectContent>
              </Select>

              {/* Price Range - More Intuitive */}
              <div className="flex gap-2 items-center bg-muted/30 rounded-lg px-3 py-1.5 border border-border">
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Price:</span>
                <div className="flex gap-1.5 items-center">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                    <Input
                      type="number"
                      placeholder="Min"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="w-20 h-8 text-sm pl-6 pr-2 bg-background"
                      min="0"
                    />
                  </div>
                  <span className="text-muted-foreground text-xs">to</span>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-20 h-8 text-sm pl-6 pr-2 bg-background"
                      min="0"
                    />
                  </div>
                  {(minPrice || maxPrice) && (
                    <button
                      onClick={() => {
                        setMinPrice("");
                        setMaxPrice("");
                      }}
                      className="text-muted-foreground hover:text-foreground p-1 ml-1"
                      title="Clear price filter"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px] h-9">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>

              {/* Grid Toggle */}
              <div className="hidden md:flex border border-border rounded-lg p-1 h-9">
                <button
                  onClick={() => setGridCols(2)}
                  className={`p-1.5 rounded ${
                    gridCols === 2
                      ? "bg-mint-500/20 text-mint-500"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setGridCols(3)}
                  className={`p-1.5 rounded ${
                    gridCols === 3
                      ? "bg-mint-500/20 text-mint-500"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Category Filter Row */}
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-sm font-medium text-muted-foreground mr-1">Category:</span>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="h-8 text-xs"
                >
                  {category}
                </Button>
              ))}
            </div>
          </motion.div>

          {/* Results Count */}
          <p className="text-sm text-muted-foreground mb-6">
            Showing {filteredArtworks.length} artwork
            {filteredArtworks.length !== 1 ? "s" : ""}
          </p>

          {/* Grid */}
          {loading ? (
            <div
              className={`grid gap-6 ${
                gridCols === 2
                  ? "grid-cols-1 md:grid-cols-2"
                  : gridCols === 3
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                  : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
              }`}
            >
              {[...Array(6)].map((_, i) => (
                <ArtCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredArtworks.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-mint-500/10 flex items-center justify-center">
                <Search className="w-8 h-8 text-mint-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No artworks found</h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your search or filters
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("All");
                  setSelectedStatus("all");
                  setMinPrice("");
                  setMaxPrice("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div
              className={`grid gap-6 ${
                gridCols === 2
                  ? "grid-cols-1 md:grid-cols-2"
                  : gridCols === 3
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                  : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
              }`}
            >
              {filteredArtworks.map((artwork, index) => (
                <ArtCard key={artwork.uid} artwork={artwork} index={index} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

