"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
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

function SuccessContent() {
  const searchParams = useSearchParams();
  const { refreshWallet, user } = useAuth();
  const [processingStatus, setProcessingStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [transactionData, setTransactionData] = useState<{
    artMintTransactionId?: string;
    gatewayPaymentId?: string;
  } | null>(null);
  const hasProcessedRef = useRef(false);
  const processingRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);

  const sessionId = searchParams.get("session_id");

  // Manual processing fallback (for local development when webhook doesn't fire)
  useEffect(() => {
    // Early return if conditions not met
    if (!sessionId || !user) return;
    
    // Check sessionStorage to prevent multiple calls across re-renders
    const storageKey = `processing_${sessionId}`;
    if (typeof window !== "undefined") {
      const isProcessing = sessionStorage.getItem(storageKey);
      if (isProcessing === "true") {
        log.info("[Success Page] Already processing this session, skipping", { sessionId });
        return;
      }
    }
    
    // Prevent multiple calls for the same sessionId
    if (sessionIdRef.current === sessionId && (hasProcessedRef.current || processingRef.current)) {
      return;
    }
    
    // Mark this sessionId as being processed
    sessionIdRef.current = sessionId;
    
    // Prevent multiple calls - check refs
    if (hasProcessedRef.current || processingRef.current) return;
    
    // Mark as processing in sessionStorage
    if (typeof window !== "undefined") {
      sessionStorage.setItem(storageKey, "true");
    }

    const processPurchase = async () => {
      // Double-check to prevent race conditions
      if (processingRef.current) return;
      processingRef.current = true;

      try {
        // Wait 2 seconds to allow webhook to fire first
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Check again after delay (in case component unmounted/remounted or session changed)
        if (hasProcessedRef.current || sessionIdRef.current !== sessionId) {
          processingRef.current = false;
          return;
        }

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

        const data = await response.json();

        if (response.ok) {
          // Success - purchase processed or already processed
          setProcessingStatus("success");
          hasProcessedRef.current = true;
          
          // Clear sessionStorage flag
          if (typeof window !== "undefined") {
            sessionStorage.removeItem(storageKey);
            sessionStorage.setItem(`processed_${sessionId}`, "true");
          }
          
          // Extract transaction IDs from response (works for both new and already processed)
          setTransactionData({
            artMintTransactionId: data.transactionId,
            gatewayPaymentId: data.gatewayPaymentId || sessionId,
          });
          
          // Refresh wallet after processing
          refreshWallet();
        } else {
          // Error response
          // Backend should return 200 even if already processed, but handle error case
          if (data.message?.includes("already processed") || data.message?.includes("Purchase already processed")) {
            setProcessingStatus("success");
            hasProcessedRef.current = true;
            
            // Try to get transaction ID from error response if available
            if (data.transactionId) {
              setTransactionData({
                artMintTransactionId: data.transactionId,
                gatewayPaymentId: data.gatewayPaymentId || sessionId,
              });
            }
          } else {
            log.error("Failed to process purchase", data);
            setProcessingStatus("error");
          }
        }
      } catch (error) {
        log.error("Error processing purchase", error);
        setProcessingStatus("error");
        // Clear sessionStorage flag on error so it can be retried
        if (typeof window !== "undefined") {
          sessionStorage.removeItem(storageKey);
        }
      } finally {
        processingRef.current = false;
      }
    };

    processPurchase();
    
    // Cleanup function to prevent calls if component unmounts
    return () => {
      // Don't reset hasProcessedRef - we want to remember if it was processed
      // Only reset processingRef if we're still processing
      if (processingRef.current) {
        processingRef.current = false;
      }
    };
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
              {processingStatus === "success" ? "Congratulations!" : "Payment Successful!"}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-muted-foreground mb-8"
            >
              {processingStatus === "success" ? (
                <>
                  You are now the proud owner of a digital masterpiece.
                  <br />
                  <span className="text-mint-500 font-semibold">
                    Art. Owned. Forever.
                  </span>
                </>
              ) : (
                <>
                  Your payment has been processed successfully.
                  <br />
                  <span className="text-mint-500 font-semibold">
                    Processing your purchase...
                  </span>
                </>
              )}
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

            {/* Transaction IDs */}
            {processingStatus === "success" && transactionData && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mb-8"
              >
                <Card className="border-mint-500/30 bg-secondary/50">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4 text-center">Transaction Details</h3>
                    <div className="space-y-4">
                      {transactionData.artMintTransactionId && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">ArtMint Transaction ID</p>
                          <p className="text-sm font-mono bg-gallery-dark p-2 rounded border border-mint-500/20 break-all">
                            {transactionData.artMintTransactionId}
                          </p>
                        </div>
                      )}
                      {transactionData.gatewayPaymentId && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Payment ID</p>
                          <p className="text-sm font-mono bg-gallery-dark p-2 rounded border border-mint-500/20 break-all">
                            {transactionData.gatewayPaymentId}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Processing Status */}
            {sessionId && processingStatus !== "success" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mb-8"
              >
                {processingStatus === "processing" && (
                  <p className="text-sm text-mint-500">Processing purchase...</p>
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

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gallery-dark">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
