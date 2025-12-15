"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Heart,
  Share2,
  ShoppingCart,
  User,
  Calendar,
  Tag,
  Shield,
  CheckCircle,
  ExternalLink,
  Loader2,
  Edit,
  DollarSign,
  X,
  HandCoins,
  Check,
  XCircle,
} from "lucide-react";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/useToast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FormattedDate } from "@/components/shared/FormattedDate";
import { log } from "@/lib/logger";
import type { Asset, ArtworkMetadata } from "@/lib/contentstack";
import type { ContentstackAsset } from "@/lib/contentstack-am2";

export default function ArtworkDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const [artwork, setArtwork] = useState<Asset | null>(null);
  const [rawStatus, setRawStatus] = useState<"sold" | "sale" | "resale" | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resaleDialogOpen, setResaleDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [offersDialogOpen, setOffersDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [resaling, setResaling] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [offers, setOffers] = useState<any[]>([]);
  const [offersCount, setOffersCount] = useState(0);
  const [acceptedOffer, setAcceptedOffer] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    price: 0,
  });
  const [resalePrice, setResalePrice] = useState(0);
  const [offerForm, setOfferForm] = useState({
    amount: 0,
    message: "",
  });

  const assetUid = params.assetUid as string;

  useEffect(() => {
    const fetchArtwork = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/assets/${assetUid}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch artwork");
        }

        // Map ContentstackAsset to Asset format
        const contentstackAsset: ContentstackAsset = data.asset;
        const artMetadata = contentstackAsset.custom_metadata?.art_metadata;
        const rawStatusValue = artMetadata?.status as
          | "sold"
          | "sale"
          | "resale"
          | null;

        const mappedArtwork: Asset = {
          uid: contentstackAsset.uid,
          title: contentstackAsset.title,
          filename: contentstackAsset.file_name,
          url: contentstackAsset.url,
          content_type: contentstackAsset.content_type,
          file_size: contentstackAsset.file_size,
          created_at: contentstackAsset.created_at,
          updated_at: contentstackAsset.updated_at,
          dimension: contentstackAsset.dimensions
            ? {
                width: contentstackAsset.dimensions.width,
                height: contentstackAsset.dimensions.height,
              }
            : undefined,
          metadata: {
            title: contentstackAsset.title,
            description: contentstackAsset.description || undefined,
            category: artMetadata?.category || "Uncategorized",
            artistId: artMetadata?.artist_uid || "",
            artistName: artMetadata?.artist_name || "Unknown Artist",
            price: artMetadata?.price || 0,
            currency: artMetadata?.currency || "USD",
            status:
              artMetadata?.status === "sold"
                ? "sold"
                : artMetadata?.status === "sale" ||
                  artMetadata?.status === "resale"
                ? "published"
                : "draft",
            current_owner: artMetadata?.current_owner
              ? {
                  userId: artMetadata.current_owner.user_id || "",
                  userName: artMetadata.current_owner.user_name || undefined,
                  purchaseDate: artMetadata.current_owner.purchase_date || "",
                  transactionId: artMetadata.current_owner.transaction_id || "",
                }
              : null,
            ownership_history: (artMetadata?.ownership_history || []).map(
              (owner) => ({
                userId: owner.user_id || "",
                userName: owner.user_name || undefined,
                purchaseDate: owner.purchase_date || "",
                transactionId: owner.transaction_id || "",
              })
            ),
            createdAt: contentstackAsset.created_at,
            tags: contentstackAsset.tags || [],
          } as ArtworkMetadata,
        };

        setArtwork(mappedArtwork);
        setRawStatus(rawStatusValue || null);
      } catch (error: any) {
        log.error("Error fetching artwork", error);
        toast({
          title: "Failed to load artwork",
          description: error.message,
          variant: "destructive",
        });
        setArtwork(null);
      } finally {
        setLoading(false);
      }
    };

    if (assetUid) {
      fetchArtwork();
    }
  }, [assetUid]);

  const metadata = artwork?.metadata as ArtworkMetadata | undefined;
  const isArtist = metadata?.artistId === profile?.id;
  const isCurrentOwner = metadata?.current_owner?.userId === profile?.id;
  console.log("isCurrentOwner", isCurrentOwner);
  const isSold = rawStatus === "sold";
  const canEditTitleDesc = isArtist && !isSold;
  const canEditPrice = isArtist || isCurrentOwner;
  const canResale = isCurrentOwner;

  // Load offers count and accepted offer when user/profile changes
  useEffect(() => {
    if (user && profile && assetUid) {
      if (isCurrentOwner) {
        loadOffers();
      } else {
        loadAcceptedOffer();
      }
    }
  }, [user, profile, assetUid, isCurrentOwner]);

  // Open edit dialog and populate form
  const handleOpenEdit = () => {
    if (artwork && metadata) {
      setEditForm({
        title: metadata.title || artwork.title,
        description: metadata.description || "",
        price: metadata.price || 0,
      });
      setEditDialogOpen(true);
    }
  };

  // Handle edit submission
  const handleEditSubmit = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to edit this artwork.",
        variant: "destructive",
      });
      return;
    }

    setEditing(true);
    try {
      const token = await user.getIdToken();
      const updateData: any = {};

      // Only include fields that can be updated based on permissions
      if (canEditTitleDesc) {
        if (editForm.title !== metadata?.title)
          updateData.title = editForm.title;
        if (editForm.description !== metadata?.description)
          updateData.description = editForm.description;
      }
      if (canEditPrice && editForm.price !== metadata?.price) {
        updateData.price = editForm.price;
        updateData.currency = metadata?.currency || "USD";
      }

      if (Object.keys(updateData).length === 0) {
        toast({
          title: "No changes",
          description: "No changes were made.",
          variant: "default",
        });
        setEditDialogOpen(false);
        return;
      }

      const response = await fetch(`/api/assets/${assetUid}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update artwork");
      }

      toast({
        title: "Artwork updated",
        description: "Your changes have been saved successfully.",
        variant: "success",
      });

      setEditDialogOpen(false);
      // Refresh artwork data
      const refreshResponse = await fetch(`/api/assets/${assetUid}`);
      const refreshData = await refreshResponse.json();
      if (refreshResponse.ok) {
        const contentstackAsset: ContentstackAsset = refreshData.asset;
        const artMetadata = contentstackAsset.custom_metadata?.art_metadata;
        const rawStatusValue = artMetadata?.status as
          | "sold"
          | "sale"
          | "resale"
          | null;
        const mappedArtwork: Asset = {
          uid: contentstackAsset.uid,
          title: contentstackAsset.title,
          filename: contentstackAsset.file_name,
          url: contentstackAsset.url,
          content_type: contentstackAsset.content_type,
          file_size: contentstackAsset.file_size,
          created_at: contentstackAsset.created_at,
          updated_at: contentstackAsset.updated_at,
          dimension: contentstackAsset.dimensions
            ? {
                width: contentstackAsset.dimensions.width,
                height: contentstackAsset.dimensions.height,
              }
            : undefined,
          metadata: {
            title: contentstackAsset.title,
            description: contentstackAsset.description || undefined,
            category: artMetadata?.category || "Uncategorized",
            artistId: artMetadata?.artist_uid || "",
            artistName: artMetadata?.artist_name || "Unknown Artist",
            price: artMetadata?.price || 0,
            currency: artMetadata?.currency || "USD",
            status:
              artMetadata?.status === "sold"
                ? "sold"
                : artMetadata?.status === "sale" ||
                  artMetadata?.status === "resale"
                ? "published"
                : "draft",
            current_owner: artMetadata?.current_owner
              ? {
                  userId: artMetadata.current_owner.user_id || "",
                  userName: artMetadata.current_owner.user_name || undefined,
                  purchaseDate: artMetadata.current_owner.purchase_date || "",
                  transactionId: artMetadata.current_owner.transaction_id || "",
                }
              : null,
            ownership_history: (artMetadata?.ownership_history || []).map(
              (owner) => ({
                userId: owner.user_id || "",
                userName: owner.user_name || undefined,
                purchaseDate: owner.purchase_date || "",
                transactionId: owner.transaction_id || "",
              })
            ),
            createdAt: contentstackAsset.created_at,
            tags: contentstackAsset.tags || [],
          } as ArtworkMetadata,
        };
        setArtwork(mappedArtwork);
        setRawStatus(rawStatusValue || null);
      }
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setEditing(false);
    }
  };

  // Handle resale submission
  const handleResaleSubmit = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to list this artwork for resale.",
        variant: "destructive",
      });
      return;
    }

    if (resalePrice <= 0) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid price.",
        variant: "destructive",
      });
      return;
    }

    setResaling(true);
    try {
      const token = await user.getIdToken();

      const response = await fetch(`/api/assets/${assetUid}/resale`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          price: resalePrice,
          currency: metadata?.currency || "USD",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to list artwork for resale");
      }

      toast({
        title: "Listed for resale",
        description: "Your artwork has been listed for resale successfully.",
        variant: "success",
      });

      setResaleDialogOpen(false);
      setResalePrice(0);

      // Refresh artwork data
      const refreshResponse = await fetch(`/api/assets/${assetUid}`);
      const refreshData = await refreshResponse.json();
      if (refreshResponse.ok) {
        const contentstackAsset: ContentstackAsset = refreshData.asset;
        const artMetadata = contentstackAsset.custom_metadata?.art_metadata;
        const rawStatusValue = artMetadata?.status as
          | "sold"
          | "sale"
          | "resale"
          | null;
        const mappedArtwork: Asset = {
          uid: contentstackAsset.uid,
          title: contentstackAsset.title,
          filename: contentstackAsset.file_name,
          url: contentstackAsset.url,
          content_type: contentstackAsset.content_type,
          file_size: contentstackAsset.file_size,
          created_at: contentstackAsset.created_at,
          updated_at: contentstackAsset.updated_at,
          dimension: contentstackAsset.dimensions
            ? {
                width: contentstackAsset.dimensions.width,
                height: contentstackAsset.dimensions.height,
              }
            : undefined,
          metadata: {
            title: contentstackAsset.title,
            description: contentstackAsset.description || undefined,
            category: artMetadata?.category || "Uncategorized",
            artistId: artMetadata?.artist_uid || "",
            artistName: artMetadata?.artist_name || "Unknown Artist",
            price: artMetadata?.price || 0,
            currency: artMetadata?.currency || "USD",
            status:
              artMetadata?.status === "sold"
                ? "sold"
                : artMetadata?.status === "sale" ||
                  artMetadata?.status === "resale"
                ? "published"
                : "draft",
            current_owner: artMetadata?.current_owner
              ? {
                  userId: artMetadata.current_owner.user_id || "",
                  userName: artMetadata.current_owner.user_name || undefined,
                  purchaseDate: artMetadata.current_owner.purchase_date || "",
                  transactionId: artMetadata.current_owner.transaction_id || "",
                }
              : null,
            ownership_history: (artMetadata?.ownership_history || []).map(
              (owner) => ({
                userId: owner.user_id || "",
                userName: owner.user_name || undefined,
                purchaseDate: owner.purchase_date || "",
                transactionId: owner.transaction_id || "",
              })
            ),
            createdAt: contentstackAsset.created_at,
            tags: contentstackAsset.tags || [],
          } as ArtworkMetadata,
        };
        setArtwork(mappedArtwork);
        setRawStatus(rawStatusValue || null);
      }
    } catch (error: any) {
      toast({
        title: "Resale failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setResaling(false);
    }
  };

  // Handle withdrawal from resale
  const handleWithdrawResale = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to withdraw this artwork from resale.",
        variant: "destructive",
      });
      return;
    }

    setWithdrawing(true);
    try {
      const token = await user.getIdToken();

      const response = await fetch(`/api/assets/${assetUid}/resale`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to withdraw artwork from resale");
      }

      toast({
        title: "Withdrawn from resale",
        description:
          "Your artwork has been withdrawn from resale successfully.",
        variant: "success",
      });

      setWithdrawDialogOpen(false);

      // Refresh artwork data
      const refreshResponse = await fetch(`/api/assets/${assetUid}`);
      const refreshData = await refreshResponse.json();
      if (refreshResponse.ok) {
        const contentstackAsset: ContentstackAsset = refreshData.asset;
        const artMetadata = contentstackAsset.custom_metadata?.art_metadata;
        const rawStatusValue = artMetadata?.status as
          | "sold"
          | "sale"
          | "resale"
          | null;
        const mappedArtwork: Asset = {
          uid: contentstackAsset.uid,
          title: contentstackAsset.title,
          filename: contentstackAsset.file_name,
          url: contentstackAsset.url,
          content_type: contentstackAsset.content_type,
          file_size: contentstackAsset.file_size,
          created_at: contentstackAsset.created_at,
          updated_at: contentstackAsset.updated_at,
          dimension: contentstackAsset.dimensions
            ? {
                width: contentstackAsset.dimensions.width,
                height: contentstackAsset.dimensions.height,
              }
            : undefined,
          metadata: {
            title: contentstackAsset.title,
            description: contentstackAsset.description || undefined,
            category: artMetadata?.category || "Uncategorized",
            artistId: artMetadata?.artist_uid || "",
            artistName: artMetadata?.artist_name || "Unknown Artist",
            price: artMetadata?.price || 0,
            currency: artMetadata?.currency || "USD",
            status:
              artMetadata?.status === "sold"
                ? "sold"
                : artMetadata?.status === "sale" ||
                  artMetadata?.status === "resale"
                ? "published"
                : "draft",
            current_owner: artMetadata?.current_owner
              ? {
                  userId: artMetadata.current_owner.user_id || "",
                  userName: artMetadata.current_owner.user_name || undefined,
                  purchaseDate: artMetadata.current_owner.purchase_date || "",
                  transactionId: artMetadata.current_owner.transaction_id || "",
                }
              : null,
            ownership_history: (artMetadata?.ownership_history || []).map(
              (owner) => ({
                userId: owner.user_id || "",
                userName: owner.user_name || undefined,
                purchaseDate: owner.purchase_date || "",
                transactionId: owner.transaction_id || "",
              })
            ),
            createdAt: contentstackAsset.created_at,
            tags: contentstackAsset.tags || [],
          } as ArtworkMetadata,
        };
        setArtwork(mappedArtwork);
        setRawStatus(rawStatusValue || null);
      }
    } catch (error: any) {
      toast({
        title: "Withdrawal failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setWithdrawing(false);
    }
  };

  // Load offers for current owner
  const loadOffers = async () => {
    if (!user || !isCurrentOwner) return;

    setLoadingOffers(true);
    try {
      const token = await user.getIdToken();
      const [offersResponse, countResponse] = await Promise.all([
        fetch(`/api/assets/${assetUid}/offers`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`/api/assets/${assetUid}/offers/count`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      const offersData = await offersResponse.json();
      const countData = await countResponse.json();

      if (offersResponse.ok) {
        setOffers(offersData.offers || []);
      }
      if (countResponse.ok) {
        setOffersCount(countData.count || 0);
      }
    } catch (error: any) {
      log.error("Error loading offers", error);
    } finally {
      setLoadingOffers(false);
    }
  };

  // Load accepted offer for current user (if they made an offer)
  const loadAcceptedOffer = async () => {
    if (!user || isCurrentOwner) return; // Only for buyers, not owners

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/assets/${assetUid}/offers/accepted`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok && data.offer) {
        setAcceptedOffer(data.offer);
      } else {
        setAcceptedOffer(null);
      }
    } catch (error: any) {
      log.error("Error loading accepted offer", error);
      setAcceptedOffer(null);
    }
  };

  // Handle offer submission
  const handleOfferSubmit = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to make an offer.",
        variant: "destructive",
      });
      return;
    }

    if (offerForm.amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid offer amount.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingOffer(true);
    try {
      const token = await user.getIdToken();

      const response = await fetch(`/api/assets/${assetUid}/offers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: offerForm.amount,
          currency: metadata?.currency || "USD",
          message: offerForm.message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit offer");
      }

      toast({
        title: "Offer submitted",
        description:
          "Your offer has been submitted successfully. The owner will be notified.",
        variant: "success",
      });

      setOfferDialogOpen(false);
      setOfferForm({ amount: 0, message: "" });

      // Reload accepted offer if user is a buyer
      if (!isCurrentOwner) {
        await loadAcceptedOffer();
      }
    } catch (error: any) {
      toast({
        title: "Offer failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmittingOffer(false);
    }
  };

  // Handle offer acceptance/rejection
  const handleOfferAction = async (
    offerId: string,
    action: "accepted" | "rejected"
  ) => {
    if (!user) return;

    try {
      const token = await user.getIdToken();

      const response = await fetch(
        `/api/assets/${assetUid}/offers/${offerId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: action }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} offer`);
      }

      toast({
        title: `Offer ${action}`,
        description: `The offer has been ${action} successfully.`,
        variant: "success",
      });

      // Reload offers and count
      await loadOffers();
    } catch (error: any) {
      toast({
        title: "Action failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to purchase this artwork.",
        variant: "destructive",
      });
      router.push("/login");
      return;
    }

    if (metadata?.artistId === profile?.id) {
      toast({
        title: "Cannot purchase",
        description: "You cannot purchase your own artwork.",
        variant: "destructive",
      });
      return;
    }

    setPurchasing(true);
    try {
      // Get Firebase ID token for authentication
      const token = await user.getIdToken();

      // Create checkout session
      const response = await fetch("/api/purchase/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ artworkId: assetUid }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error: any) {
      toast({
        title: "Purchase failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: artwork?.title,
        text: metadata?.description,
        url: window.location.href,
      });
    } catch {
      // Fallback to clipboard
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied!",
        description: "Artwork link copied to clipboard.",
        variant: "success",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gallery-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-mint-500" />
      </div>
    );
  }

  if (!artwork) {
    return (
      <div className="min-h-screen bg-gallery-dark">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 text-center py-20">
            <h1 className="text-2xl font-bold mb-4">Artwork not found</h1>
            <p className="text-muted-foreground mb-6">
              This artwork may have been removed or doesn&apos;t exist.
            </p>
            <Link href="/gallery">
              <Button>Back to Gallery</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Check if user is the CURRENT owner (last owner in the array)
  const isOwned = metadata?.current_owner?.userId === profile?.id;

  return (
    <div className="min-h-screen bg-gallery-dark">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Back Button */}
          <Link
            href="/gallery"
            className="inline-flex items-center text-muted-foreground hover:text-mint-500 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Gallery
          </Link>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Artwork Image */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative"
            >
              <div className="sticky top-24">
                <div className="art-card gradient-border rounded-2xl overflow-hidden bg-gallery-card">
                  <div className="relative aspect-square">
                    <Image
                      src={artwork.url}
                      alt={artwork.title}
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-4">
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1"
                    onClick={() => setIsLiked(!isLiked)}
                  >
                    <Heart
                      className={`w-5 h-5 mr-2 ${
                        isLiked ? "fill-red-500 text-red-500" : ""
                      }`}
                    />
                    {isLiked ? "Liked" : "Like"}
                  </Button>
                  <Button variant="outline" size="lg" onClick={handleShare}>
                    <Share2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Artwork Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              {/* Title & Artist */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 text-sm rounded-full bg-mint-500/10 text-mint-500 border border-mint-500/20">
                    {metadata?.category}
                  </span>
                  {isOwned && (
                    <span className="px-3 py-1 text-sm rounded-full bg-mint-500 text-gallery-dark font-medium">
                      Owned
                    </span>
                  )}
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                  {metadata?.title || artwork.title}
                </h1>
                <Link
                  href={`/artists/${metadata?.artistId}`}
                  className="inline-flex items-center gap-3 group"
                >
                  <div className="w-12 h-12 rounded-full bg-mint-500/20 flex items-center justify-center">
                    <User className="w-6 h-6 text-mint-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Artist</p>
                    <p className="font-semibold group-hover:text-mint-500 transition-colors">
                      {metadata?.artistName}
                    </p>
                  </div>
                </Link>
              </div>

              {/* Price Card */}
              <Card className="border-mint-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm text-muted-foreground">
                          Current Price
                        </p>
                        {canEditPrice && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={handleOpenEdit}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      <p className="text-4xl font-bold text-mint-500">
                        {formatCurrency(
                          metadata?.price || 0,
                          metadata?.currency || "USD"
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-mint-500">
                      <Shield className="w-5 h-5" />
                      <span className="text-sm font-medium">Verified</span>
                    </div>
                  </div>

                  {isOwned ? (
                    <div className="space-y-3">
                      <Link href="/dashboard">
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-mint-500/10 border border-mint-500/20 hover:bg-mint-500/20 transition-colors cursor-pointer group">
                          <CheckCircle className="w-6 h-6 text-mint-500" />
                          <div className="flex-1">
                            <p className="font-semibold">
                              You own this artwork
                            </p>
                            <p className="text-sm text-muted-foreground group-hover:text-mint-500 transition-colors">
                              View in your collection →
                            </p>
                          </div>
                        </div>
                      </Link>
                      {canResale && (
                        <div className="space-y-2">
                          {rawStatus === "sold" && offersCount > 0 ? (
                            <Button
                              variant="outline"
                              size="lg"
                              className="w-full relative"
                              onClick={async () => {
                                await loadOffers();
                                setOffersDialogOpen(true);
                              }}
                            >
                              <HandCoins className="w-5 h-5 mr-2" />
                              View Offers
                              {offersCount > 0 && (
                                <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-mint-500 text-xs font-bold text-gallery-dark">
                                  {offersCount > 9 ? "9+" : offersCount}
                                </span>
                              )}
                            </Button>
                          ) : null}
                          {rawStatus === "resale" ? (
                            <>
                              <Button
                                variant="outline"
                                size="lg"
                                className="w-full"
                                onClick={() => {
                                  setResalePrice(metadata?.price || 0);
                                  setResaleDialogOpen(true);
                                }}
                              >
                                <DollarSign className="w-5 h-5 mr-2" />
                                Update Resale Price
                              </Button>
                              <Button
                                variant="outline"
                                size="lg"
                                className="w-full border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-600"
                                onClick={() => setWithdrawDialogOpen(true)}
                              >
                                <X className="w-5 h-5 mr-2" />
                                Withdraw from Resale
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="lg"
                              className="w-full"
                              onClick={() => {
                                setResalePrice(metadata?.price || 0);
                                setResaleDialogOpen(true);
                              }}
                            >
                              <DollarSign className="w-5 h-5 mr-2" />
                              List for Resale
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {isSold ? (
                        <>
                          {/* Check if there's an accepted offer for this buyer (from Firebase) */}
                          {acceptedOffer &&
                          acceptedOffer.buyerId === profile?.id ? (
                            <div className="space-y-3">
                              <div className="p-4 rounded-lg bg-mint-500/10 border border-mint-500/20 text-center">
                                <p className="font-semibold text-lg mb-1 text-mint-500">
                                  Offer Accepted!
                                </p>
                                <p className="text-sm text-muted-foreground mb-3">
                                  Your offer of{" "}
                                  {formatCurrency(
                                    acceptedOffer.amount || 0,
                                    acceptedOffer.currency || "USD"
                                  )}{" "}
                                  has been accepted.
                                </p>
                                <Button
                                  size="lg"
                                  className="w-full"
                                  onClick={handlePurchase}
                                  disabled={purchasing}
                                >
                                  {purchasing ? (
                                    <>
                                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <ShoppingCart className="w-5 h-5 mr-2" />
                                      Complete Purchase
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="p-4 rounded-lg bg-muted border border-border text-center mb-2">
                                <p className="font-semibold text-lg mb-1">
                                  Sold Art
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  This artwork has been sold. Make an offer to
                                  the current owner.
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="lg"
                                className="w-full"
                                onClick={() => {
                                  setOfferForm({
                                    amount: metadata?.price || 0,
                                    message: "",
                                  });
                                  setOfferDialogOpen(true);
                                }}
                              >
                                <HandCoins className="w-5 h-5 mr-2" />
                                Make an Offer
                              </Button>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <Button
                            size="lg"
                            className="w-full"
                            onClick={handlePurchase}
                            disabled={purchasing}
                          >
                            {purchasing ? (
                              <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="w-5 h-5 mr-2" />
                                Buy Now
                              </>
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Separator />

              {/* Description */}
              <div>
                <h2 className="text-xl font-semibold mb-3">
                  About this artwork
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {metadata?.description}
                </p>
              </div>

              {/* Details */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Details</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="font-medium">
                        <FormattedDate
                          date={metadata?.createdAt || artwork.created_at}
                        />
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <ExternalLink className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Format</p>
                      <p className="font-medium">
                        {artwork.dimension
                          ? `${artwork.dimension.width} x ${artwork.dimension.height}`
                          : "Digital"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {metadata?.tags && metadata.tags.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-3">Tags</h2>
                  <div className="flex flex-wrap gap-2">
                    {metadata.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-secondary hover:bg-mint-500/10 transition-colors cursor-pointer"
                      >
                        <Tag className="w-3 h-3 mr-1.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Ownership History */}
              {metadata?.ownership_history &&
                metadata.ownership_history.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">
                      Ownership History
                    </h2>
                    <div className="space-y-3">
                      {metadata.ownership_history.map((owner, index) => (
                        <div
                          key={
                            owner.transactionId ||
                            owner.userId ||
                            `owner-${index}`
                          }
                          className="flex items-center justify-between p-4 rounded-lg bg-secondary"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-mint-500/20 flex items-center justify-center">
                              <User className="w-5 h-5 text-mint-500" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {owner.userName || `Owner ${index + 1}`}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {owner.transactionId
                                  ? `${owner.transactionId.slice(0, 16)}...`
                                  : "N/A"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">Purchased</p>
                            <p className="text-xs text-muted-foreground">
                              <FormattedDate date={owner.purchaseDate} />
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Artwork</DialogTitle>
            <DialogDescription>
              {canEditTitleDesc
                ? "Update the artwork details. Title and description can only be edited if the artwork hasn't been sold."
                : "Update the artwork price."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {canEditTitleDesc && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm({ ...editForm, title: e.target.value })
                    }
                    placeholder="Artwork title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <textarea
                    id="edit-description"
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                    placeholder="Artwork description"
                    rows={4}
                    className="flex w-full rounded-lg border border-input bg-card px-4 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-500/50 focus-visible:border-mint-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 resize-none"
                  />
                </div>
              </>
            )}
            {canEditPrice && (
              <div className="space-y-2">
                <Label htmlFor="edit-price">
                  Price ({metadata?.currency || "USD"})
                </Label>
                <Input
                  id="edit-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.price}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={editing}
            >
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={editing}>
              {editing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resale Dialog */}
      <Dialog open={resaleDialogOpen} onOpenChange={setResaleDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>List for Resale</DialogTitle>
            <DialogDescription>
              Set a new price to list this artwork on the secondary market.
              Buyers will be able to purchase it at this price.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="resale-price">
                Resale Price ({metadata?.currency || "USD"})
              </Label>
              <Input
                id="resale-price"
                type="number"
                min="0"
                step="0.01"
                value={resalePrice}
                onChange={(e) =>
                  setResalePrice(parseFloat(e.target.value) || 0)
                }
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Current price:{" "}
                {formatCurrency(
                  metadata?.price || 0,
                  metadata?.currency || "USD"
                )}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResaleDialogOpen(false)}
              disabled={resaling}
            >
              Cancel
            </Button>
            <Button onClick={handleResaleSubmit} disabled={resaling}>
              {resaling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Listing...
                </>
              ) : (
                "List for Resale"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw from Resale Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Withdraw from Resale</DialogTitle>
            <DialogDescription>
              Are you sure you want to withdraw this artwork from resale? It
              will no longer be available for purchase on the secondary market.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This action will change the status back to &quot;sold&quot; and
              remove it from the marketplace. You can list it for resale again
              at any time.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setWithdrawDialogOpen(false)}
              disabled={withdrawing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleWithdrawResale}
              disabled={withdrawing}
              variant="destructive"
            >
              {withdrawing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Withdrawing...
                </>
              ) : (
                "Withdraw from Resale"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Make an Offer Dialog */}
      <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Make an Offer</DialogTitle>
            <DialogDescription>
              Submit an offer to the current owner. They will be notified and
              can accept or reject your offer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="offer-amount">
                Offer Amount ({metadata?.currency || "USD"})
              </Label>
              <Input
                id="offer-amount"
                type="number"
                min="0"
                step="0.01"
                value={offerForm.amount}
                onChange={(e) =>
                  setOfferForm({
                    ...offerForm,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Current asking price:{" "}
                {formatCurrency(
                  metadata?.price || 0,
                  metadata?.currency || "USD"
                )}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-message">Message (Optional)</Label>
              <textarea
                id="offer-message"
                value={offerForm.message}
                onChange={(e) =>
                  setOfferForm({ ...offerForm, message: e.target.value })
                }
                placeholder="Add a message to the owner..."
                rows={4}
                className="flex w-full rounded-lg border border-input bg-card px-4 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-500/50 focus-visible:border-mint-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOfferDialogOpen(false)}
              disabled={submittingOffer}
            >
              Cancel
            </Button>
            <Button onClick={handleOfferSubmit} disabled={submittingOffer}>
              {submittingOffer ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Offer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Offers Dialog */}
      <Dialog open={offersDialogOpen} onOpenChange={setOffersDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Offers</DialogTitle>
            <DialogDescription>
              View and manage offers for this artwork. You can accept or reject
              any offer.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {loadingOffers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-mint-500" />
              </div>
            ) : offers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <HandCoins className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No offers yet</p>
                <p className="text-sm mt-2">
                  Buyers can make offers when your artwork is listed for resale.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {offers.map((offer: any) => (
                  <Card key={offer.id} className="border-mint-500/30">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <p className="font-semibold">{offer.buyerName}</p>
                          </div>
                          <p className="text-2xl font-bold text-mint-500">
                            {formatCurrency(offer.amount, offer.currency)}
                          </p>
                          {offer.message && (
                            <p className="text-sm text-muted-foreground mt-2 italic">
                              &quot;{offer.message}&quot;
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            <FormattedDate date={offer.createdAt} />
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-500/50 text-green-500 hover:bg-green-500/10"
                            onClick={() =>
                              handleOfferAction(offer.id, "accepted")
                            }
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                            onClick={() =>
                              handleOfferAction(offer.id, "rejected")
                            }
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOffersDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
