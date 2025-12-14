"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Shield,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Zap,
  Heart,
  Users,
  Search,
} from "lucide-react";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gallery-dark">
      <Header />

      {/* Hero Section */}
      <section className="hero-gradient min-h-screen flex items-center pt-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              className="space-y-8"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-mint-500/10 border border-mint-500/20">
                <Sparkles className="w-4 h-4 text-mint-500" />
                <span className="text-sm text-mint-500 font-medium">
                  Art. Owned. Forever.
                </span>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold leading-tight">
                <span className="gradient-text">OWN</span> THE
                <br />
                DIGITAL ORIGINAL
              </h1>

              <p className="text-xl text-muted-foreground max-w-xl">
                The first marketplace where buying digital art truly makes it
                yours. Browse → Collect → Showcase your collection with verified
                ownership.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/gallery">
                  <Button size="lg" className="w-full sm:w-auto group">
                    Explore Art
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    Start Collecting
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 pt-8 border-t border-border">
                <div>
                  <p className="text-3xl font-bold text-mint-500">10K+</p>
                  <p className="text-sm text-muted-foreground">Artworks</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-mint-500">2.5K+</p>
                  <p className="text-sm text-muted-foreground">Artists</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-mint-500">$5M+</p>
                  <p className="text-sm text-muted-foreground">Volume</p>
                </div>
              </div>
            </motion.div>

            {/* Right - Featured Art Preview */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="relative z-10">
                {/* Main Art Card */}
                <div className="art-card p-1 bg-gradient-to-br from-mint-500/20 to-purple-500/20 rounded-2xl">
                  <div className="bg-gallery-card rounded-xl overflow-hidden">
                    <div className="aspect-square relative bg-gradient-to-br from-mint-500/10 to-purple-500/10 flex items-center justify-center">
                      <div className="text-center space-y-4 p-8">
                        <Image
                          src="/logo.png"
                          alt="ArtMint"
                          width={96}
                          height={96}
                          className="w-24 h-24 mx-auto opacity-50 logo-mint"
                        />
                        <p className="text-muted-foreground">
                          Featured artwork preview
                        </p>
                      </div>
                    </div>
                    <div className="p-6 space-y-3">
                      <h3 className="text-xl font-bold">Digital Dreamscape</h3>
                      <div className="flex items-center justify-between">
                        <span className="text-mint-500 font-bold text-lg">
                          $2,500
                        </span>
                        <span className="text-sm text-muted-foreground">
                          by @artist
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Elements */}
                <motion.div
                  className="absolute -top-4 -right-4 px-4 py-2 bg-mint-500 rounded-lg shadow-lg"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <span className="text-gallery-dark font-bold text-sm">
                    ✨ Verified
                  </span>
                </motion.div>

                <motion.div
                  className="absolute -bottom-4 -left-4 px-4 py-3 bg-card rounded-lg border border-border shadow-lg"
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-mint-500/20 flex items-center justify-center">
                      <Heart className="w-5 h-5 text-mint-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">New Owner!</p>
                      <p className="text-xs text-muted-foreground">
                        Just purchased
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Background Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-mint-500/20 rounded-full blur-3xl -z-10" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 border-t border-border">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-4">How ArtMint Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A seamless, secure way to turn digital art into real digital
              property
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              {
                icon: <Users className="w-8 h-8" />,
                title: "Create Account",
                description:
                  "Sign up as an artist or collector. Your personal wallet is created automatically.",
              },
              {
                icon: <Search className="w-8 h-8" />,
                title: "Discover & Collect",
                description:
                  "Browse unique digital artworks. Find pieces that speak to you.",
              },
              {
                icon: <Shield className="w-8 h-8" />,
                title: "Own Forever",
                description:
                  "Purchase securely. Ownership is permanently linked to your account.",
              },
            ].map((step, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="relative overflow-hidden group hover:border-mint-500/50 transition-colors">
                  <CardContent className="p-8">
                    <div className="absolute top-4 right-4 text-6xl font-bold text-mint-500/10">
                      {index + 1}
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-mint-500/10 flex items-center justify-center mb-6 text-mint-500 group-hover:bg-mint-500 group-hover:text-gallery-dark transition-colors">
                      {step.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Why ArtMint */}
      <section className="py-24 bg-gradient-to-b from-gallery-dark to-gallery-card">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-4xl font-bold">
                Why <span className="text-mint-500">ArtMint</span> Exists
              </h2>
              <p className="text-xl text-muted-foreground">
                Digital art is everywhere — but ownership is nowhere.
                <br />
                <strong className="text-foreground">We change that</strong> by
                giving every purchased artwork a certified identity and rightful
                owner.
              </p>

              <div className="space-y-4">
                {[
                  "Creators earn fairly for their talent",
                  "Collectors proudly own what they love",
                  "Art lives forever with its story preserved",
                ].map((point, index) => (
                  <motion.div
                    key={index}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <CheckCircle className="w-6 h-6 text-mint-500 flex-shrink-0" />
                    <span className="text-lg">{point}</span>
                  </motion.div>
                ))}
              </div>

              <Link href="/signup?role=artist">
                <Button size="lg" className="mt-4">
                  Become an Artist
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-4"
            >
              {[
                {
                  icon: <Shield className="w-6 h-6" />,
                  title: "Secure Ownership",
                  stat: "100%",
                },
                {
                  icon: <Zap className="w-6 h-6" />,
                  title: "Instant Transfer",
                  stat: "<1s",
                },
                {
                  icon: <Heart className="w-6 h-6" />,
                  title: "Artist Revenue",
                  stat: "95%",
                },
                {
                  icon: <Users className="w-6 h-6" />,
                  title: "Active Users",
                  stat: "50K+",
                },
              ].map((item, index) => (
                <Card
                  key={index}
                  className="hover:border-mint-500/50 transition-colors"
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-mint-500/10 flex items-center justify-center mx-auto mb-4 text-mint-500">
                      {item.icon}
                    </div>
                    <p className="text-3xl font-bold text-mint-500 mb-1">
                      {item.stat}
                    </p>
                    <p className="text-sm text-muted-foreground">{item.title}</p>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div
            className="relative overflow-hidden rounded-3xl p-12 md:p-20 text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-mint-500/20 via-purple-500/10 to-mint-500/20" />
            <div className="absolute inset-0 bg-gallery-card/80" />

            {/* Content */}
            <div className="relative z-10 max-w-3xl mx-auto space-y-8">
              <h2 className="text-4xl md:text-5xl font-bold">
                Ready to Own Your First
                <br />
                <span className="gradient-text">Digital Masterpiece?</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                Join thousands of collectors and artists already on ArtMint.
                Start your collection today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/gallery">
                  <Button size="lg">
                    Browse Gallery
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button variant="outline" size="lg">
                    Create Account
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

