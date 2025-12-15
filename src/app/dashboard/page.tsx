"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Upload,
  Image as ImageIcon,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { useAuth, useRequireAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { ArtCard, ArtCardSkeleton } from "@/components/shared/ArtCard";
import { formatCurrency, formatDate, truncate } from "@/lib/utils";
import { FormattedDate } from "@/components/shared/FormattedDate";
import { log } from "@/lib/logger";
import { cn } from "@/lib/utils";
import type { Asset } from "@/lib/contentstack";

export default function DashboardPage() {
  const { profile, wallet, refreshWallet, user } = useAuth();
  const { loading } = useRequireAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [ownedArtworks, setOwnedArtworks] = useState<Asset[]>([]);
  const [loadingArtworks, setLoadingArtworks] = useState(true);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshWallet();
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Fetch owned artworks (for buyers) or published works (for artists)
  useEffect(() => {
    const fetchArtworks = async () => {
      if (!user || !profile) {
        setLoadingArtworks(false);
        return;
      }

      setLoadingArtworks(true);
      try {
        // Get auth token
        const token = await user.getIdToken();

        // Both buyers and artists use the same collection endpoint
        // - Buyers: Shows purchased artworks
        // - Artists: Shows all uploaded/published artworks (stored when they upload)
        const response = await fetch("/api/collection", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch collection");
        }

        setOwnedArtworks(data.artworks || []);
      } catch (error: any) {
        log.error("Error fetching artworks", error);
        setOwnedArtworks([]);
      } finally {
        setLoadingArtworks(false);
      }
    };

    fetchArtworks();
  }, [user, wallet, profile]);

  if (loading) {
    return <PageLoader />;
  }

  const transactions = wallet?.transactions || [];
  const sortedTransactions = [...transactions].reverse();

  return (
    <div className="min-h-screen bg-gallery-dark">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  Welcome, {profile?.displayName}
                </h1>
                <p className="text-muted-foreground">
                  Manage your wallet and track your transactions
                </p>
              </div>
              {profile?.role === "artist" && (
                <Link href="/artist/upload">
                  <Button>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Art
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid md:grid-cols-3 gap-6 mb-8"
          >
            {/* Wallet Balance */}
            <Card className="border-mint-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                  Wallet Balance
                  <button
                    onClick={handleRefresh}
                    className="p-1 hover:bg-mint-500/10 rounded transition-colors"
                    disabled={refreshing}
                  >
                    <RefreshCw
                      className={cn(
                        "w-4 h-4 text-mint-500",
                        refreshing && "animate-spin"
                      )}
                    />
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-mint-500">
                    {formatCurrency(wallet?.balance || 0)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-mono">
                    {truncate(wallet?.id || "", 20)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Total Spent / Earned */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {profile?.role === "artist" ? "Total Earned" : "Total Spent"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">
                    {formatCurrency(
                      transactions
                        .filter(
                          (t) =>
                            t.type ===
                            (profile?.role === "artist" ? "CREDIT" : "DEBIT")
                        )
                        .reduce((sum, t) => sum + t.amount, 0)
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                  {profile?.role === "artist" ? (
                    <TrendingUp className="w-4 h-4 text-mint-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-orange-500" />
                  )}
                  <span className="text-xs">
                    {
                      transactions.filter(
                        (t) =>
                          t.type ===
                          (profile?.role === "artist" ? "CREDIT" : "DEBIT")
                      ).length
                    }{" "}
                    transactions
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Art Collection / Published */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {profile?.role === "artist" ? "Published Works" : "Collection"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">
                    {profile?.role === "artist"
                      ? ownedArtworks.length
                      : transactions.filter(
                          (t) => t.type === "DEBIT" && t.reference.assetUid
                        ).length}
                  </span>
                  <span className="text-muted-foreground">artworks</span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                  <ImageIcon className="w-4 h-4" />
                  <span className="text-xs">
                    {profile?.role === "artist"
                      ? "Listed on marketplace"
                      : "In your collection"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Collection (for buyers) or Published Works (for artists) */}
          {(profile?.role === "buyer" || profile?.role === "artist") && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      {profile?.role === "artist" ? "Published Works" : "Your Collection"}
                    </CardTitle>
                    {ownedArtworks.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {ownedArtworks.length} artwork
                        {ownedArtworks.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingArtworks ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {[...Array(4)].map((_, i) => (
                        <ArtCardSkeleton key={i} />
                      ))}
                    </div>
                  ) : ownedArtworks.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {ownedArtworks.map((artwork, index) => (
                        <ArtCard key={artwork.uid} artwork={artwork} index={index} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-mint-500/10 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-mint-500" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">
                        {profile?.role === "artist"
                          ? "No published works yet"
                          : "No artworks in your collection yet"}
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        {profile?.role === "artist"
                          ? "Start sharing your art with the world by uploading your first piece"
                          : "Start building your collection by purchasing artworks from the gallery"}
                      </p>
                      <Link href={profile?.role === "artist" ? "/artist/upload" : "/gallery"}>
                        <Button>
                          {profile?.role === "artist" ? "Upload Artwork" : "Browse Gallery"}
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Transactions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all">
                  <TabsList className="mb-4">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="purchases">Purchases</TabsTrigger>
                    <TabsTrigger value="deposits">Deposits</TabsTrigger>
                  </TabsList>

                  <TabsContent value="all">
                    <TransactionList transactions={sortedTransactions} />
                  </TabsContent>

                  <TabsContent value="purchases">
                    <TransactionList
                      transactions={sortedTransactions.filter(
                        (t) => t.type === "DEBIT"
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="deposits">
                    <TransactionList
                      transactions={sortedTransactions.filter(
                        (t) => t.type === "CREDIT"
                      )}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

interface Transaction {
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

function TransactionList({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-mint-500/10 flex items-center justify-center">
          <Clock className="w-8 h-8 text-mint-500" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
        <p className="text-muted-foreground mb-6">
          Start exploring the gallery to make your first purchase
        </p>
        <Link href="/gallery">
          <Button>Browse Gallery</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx) => (
        <div
          key={tx.id}
          className="flex items-center justify-between p-4 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                tx.type === "CREDIT"
                  ? "bg-mint-500/20 text-mint-500"
                  : "bg-orange-500/20 text-orange-500"
              )}
            >
              {tx.type === "CREDIT" ? (
                <ArrowDownRight className="w-5 h-5" />
              ) : (
                <ArrowUpRight className="w-5 h-5" />
              )}
            </div>
            <div>
              <p className="font-medium">
                {tx.type === "CREDIT" ? "Deposit" : "Purchase"}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {truncate(tx.id, 24)}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p
              className={cn(
                "font-semibold",
                tx.type === "CREDIT" ? "text-mint-500" : "text-orange-500"
              )}
            >
              {tx.type === "CREDIT" ? "+" : "-"}
              {formatCurrency(tx.amount)}
            </p>
            <p className="text-xs text-muted-foreground">
              <FormattedDate date={tx.timestamp} />
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

