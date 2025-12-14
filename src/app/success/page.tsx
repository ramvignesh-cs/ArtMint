"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { log } from "@/lib/logger";
import { CheckCircle, ArrowRight, Image as ImageIcon, Wallet, Sparkles } from "lucide-react";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const { refreshWallet, user } = useAuth();
  const [processingStatus, setProcessingStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const hasProcessedRef = useRef(false);
  const processingRef = useRef(false);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    // Refresh wallet after successful purchase
    refreshWallet();
  }, []); // Only run once on mount

  // Manual processing fallback (for local development when webhook doesn't fire)
  useEffect(() => {
    if (!sessionId || !user || hasProcessedRef.current || processingRef.current) return;

    const processPurchase = async () => {
      // Prevent multiple simultaneous calls
      if (processingRef.current) return;
      processingRef.current = true;

      try {
        // Wait 2 seconds to allow webhook to fire first
        await new Promise((resolve) => setTimeout(resolve, 2000));

        setProcessingStatus("processing");
        const token = await user.getIdToken();

        const response = await fetch("/api/purchase/process", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ sessionId }),
        });

        if (response.ok) {
          const data = await response.json();
          setProcessingStatus("success");
          hasProcessedRef.current = true;
          // Refresh wallet after processing
          refreshWallet();
        } else {
          const error = await response.json();
          // If already processed, that's fine
          if (error.message?.includes("already processed") || error.message?.includes("Purchase already processed")) {
            setProcessingStatus("success");
            hasProcessedRef.current = true;
          } else {
            log.error("Failed to process purchase", error);
            setProcessingStatus("error");
          }
        }
      } catch (error) {
        log.error("Error processing purchase", error);
        setProcessingStatus("error");
      } finally {
        processingRef.current = false;
      }
    };

    processPurchase();
  }, [sessionId, user]); // Removed refreshWallet from dependencies

  return (
    <div className="min-h-screen bg-gallery-dark">
      <Header />

      {/* Animated background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-mint-500/30 rounded-full"
            initial={{
              x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1000),
              y: -20,
              scale: Math.random() * 0.5 + 0.5,
            }}
            animate={{
              y: typeof window !== "undefined" ? window.innerHeight + 20 : 1000,
              rotate: 360,
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "linear",
            }}
          />
        ))}
      </div>

      <main className="pt-24 pb-16 min-h-[80vh] flex items-center justify-center relative z-10">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-lg mx-auto text-center"
          >
            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mb-8"
            >
              <div className="relative">
                <div className="w-24 h-24 mx-auto rounded-full bg-mint-500 flex items-center justify-center animate-glow">
                  <CheckCircle className="w-14 h-14 text-gallery-dark" />
                </div>
                {/* Sparkle decorations */}
                <motion.div
                  className="absolute -top-2 -right-2"
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 15, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="w-8 h-8 text-mint-500" />
                </motion.div>
                <motion.div
                  className="absolute -bottom-2 -left-2"
                  animate={{ scale: [1, 1.2, 1], rotate: [0, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                >
                  <Sparkles className="w-6 h-6 text-purple-500" />
                </motion.div>
              </div>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl font-bold mb-4"
            >
              Congratulations!
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-muted-foreground mb-8"
            >
              You are now the proud owner of a digital masterpiece.
              <br />
              <span className="text-mint-500 font-semibold">
                Art. Owned. Forever.
              </span>
            </motion.p>

            {/* Info Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-2 gap-4 mb-8"
            >
              <Card className="border-mint-500/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-mint-500/20 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-mint-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-muted-foreground">Ownership</p>
                    <p className="font-semibold text-mint-500">Verified</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-mint-500/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-mint-500/20 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-mint-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-muted-foreground">Transaction</p>
                    <p className="font-semibold text-mint-500">Complete</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Session ID */}
            {sessionId && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mb-8"
              >
                <p className="text-xs text-muted-foreground mb-2 font-mono">
                  Transaction: {sessionId.slice(0, 24)}...
                </p>
                {processingStatus === "processing" && (
                  <p className="text-sm text-mint-500">Processing purchase...</p>
                )}
                {processingStatus === "success" && (
                  <p className="text-sm text-green-500">Purchase processed successfully!</p>
                )}
                {processingStatus === "error" && (
                  <p className="text-sm text-yellow-500">
                    Processing... (If webhook is running, this will complete automatically)
                  </p>
                )}
              </motion.div>
            )}

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link href="/dashboard">
                <Button size="lg" className="w-full sm:w-auto">
                  View Collection
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/gallery">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Continue Shopping
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
