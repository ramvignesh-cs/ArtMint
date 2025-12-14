"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, User, ExternalLink, Loader2 } from "lucide-react";
import { log } from "@/lib/logger";
import Image from "next/image";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface Artist {
  id: string;
  name: string;
  artworks: number;
  bio: string;
  totalSales: number;
  avatar: string;
}

export default function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArtists = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/artists");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch artists");
        }

        setArtists(data.artists || []);
      } catch (error: any) {
        log.error("Error fetching artists", error);
        // Fallback to empty array on error
        setArtists([]);
      } finally {
        setLoading(false);
      }
    };

    fetchArtists();
  }, []);

  const filteredArtists = artists.filter((artist) =>
    artist.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              Featured <span className="text-mint-500">Artists</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl">
              Discover talented digital artists and explore their unique
              collections.
            </p>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8 max-w-md"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search artists..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </motion.div>

          {/* Artists Grid */}
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-16 h-16 rounded-full bg-mint-500/20" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-secondary rounded w-3/4" />
                        <div className="h-3 bg-secondary rounded w-full" />
                        <div className="h-3 bg-secondary rounded w-2/3" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                      <div className="h-8 bg-secondary rounded" />
                      <div className="h-8 bg-secondary rounded" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArtists.map((artist, index) => (
              <motion.div
                key={artist.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="group hover:border-mint-500/50 transition-all duration-300">
                  <CardContent className="p-6">
                    {/* Artist Avatar */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-16 h-16 rounded-full bg-mint-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-mint-500/30 transition-colors">
                        <User className="w-8 h-8 text-mint-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg group-hover:text-mint-500 transition-colors">
                          {artist.name}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {artist?.bio ?? "No bio available"}
                        </p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-border">
                      <div>
                        <p className="text-2xl font-bold text-mint-500">
                          {artist.artworks}
                        </p>
                        <p className="text-xs text-muted-foreground">Artworks</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          ${(artist.totalSales / 1000).toFixed(0)}K
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Total Sales
                        </p>
                      </div>
                    </div>

                    {/* View Button */}
                    <Link
                      href={`/gallery?artistId=${artist.id}`}
                      className="block"
                    >
                      <Button variant="outline" className="w-full group/btn">
                        <Image src="/logo.png" alt="Art" width={16} height={16} className="w-4 h-4 mr-2 logo-mint" />
                        View Collection
                        <ExternalLink className="w-4 h-4 ml-2 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {filteredArtists.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-mint-500/10 flex items-center justify-center">
                <User className="w-8 h-8 text-mint-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No artists found</h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your search
              </p>
              <Button variant="outline" onClick={() => setSearchTerm("")}>
                Clear Search
              </Button>
            </div>
          )}

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-16 text-center"
          >
            <div className="max-w-2xl mx-auto p-8 rounded-2xl bg-gradient-to-br from-mint-500/10 to-purple-500/10 border border-mint-500/20">
              <h2 className="text-2xl font-bold mb-3">Are you an artist?</h2>
              <p className="text-muted-foreground mb-6">
                Join ArtMint and start selling your digital masterpieces to
                collectors worldwide.
              </p>
              <Link href="/signup?role=artist">
                <Button size="lg">
                  Become an Artist
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

