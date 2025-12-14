"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  ArrowLeft,
  Brush,
  ShoppingBag,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { signUpSchema, type SignUpInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get("role") as "buyer" | "artist" | null;

  const { signUp, signInGoogle, signInApple, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"buyer" | "artist">(
    defaultRole || "buyer"
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      role: defaultRole || "buyer",
    },
  });

  const onSubmit = async (data: SignUpInput) => {
    setIsSubmitting(true);
    try {
      await signUp(data.email, data.password, data.displayName, selectedRole);
      toast({
        title: "Welcome to ArtMint!",
        description: "Your account has been created successfully.",
        variant: "success",
      });
      router.push("/gallery");
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      await signInGoogle(selectedRole);
      router.push("/gallery");
    } catch (error: any) {
      toast({
        title: "Google sign up failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAppleSignUp = async () => {
    try {
      await signInApple(selectedRole);
      router.push("/gallery");
    } catch (error: any) {
      toast({
        title: "Apple sign up failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gallery-dark flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 hero-gradient items-center justify-center p-12">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-md space-y-8"
        >
          <Link href="/" className="flex items-center group">
            <Image
              src="/logo.png"
              alt="ArtMint Logo"
              width={48}
              height={48}
              className="w-12 h-12 logo-mint"
            />
            <span className="text-3xl font-bold">
              Art<span className="text-mint-500">Mint</span>
            </span>
          </Link>

          <div className="space-y-4">
            <h1 className="text-4xl font-bold">Join ArtMint</h1>
            <p className="text-xl text-muted-foreground">
              Where digital creativity becomes true ownership. Start your
              journey today.
            </p>
          </div>

          <div className="space-y-6 pt-8 border-t border-border">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-mint-500/10 flex items-center justify-center flex-shrink-0">
                <Brush className="w-5 h-5 text-mint-500" />
              </div>
              <div>
                <h3 className="font-semibold">For Artists</h3>
                <p className="text-sm text-muted-foreground">
                  Upload and sell your digital masterpieces. Keep 95% of every
                  sale.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-mint-500/10 flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-5 h-5 text-mint-500" />
              </div>
              <div>
                <h3 className="font-semibold">For Collectors</h3>
                <p className="text-sm text-muted-foreground">
                  Discover unique art and truly own what you purchase. Forever.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo.png"
                alt="ArtMint Logo"
                width={40}
                height={40}
                className="w-10 h-10 logo-mint"
              />
              <span className="text-2xl font-bold">
                Art<span className="text-mint-500">Mint</span>
              </span>
            </Link>
          </div>

          <Card className="border-border">
            <CardHeader className="space-y-1">
              <Link
                href="/"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-mint-500 mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to home
              </Link>
              <CardTitle className="text-2xl">Create your account</CardTitle>
              <p className="text-muted-foreground">
                Choose your role and start your journey
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Role Selection */}
              <div className="space-y-2">
                <Label>I want to join as a...</Label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedRole("buyer")}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all",
                      selectedRole === "buyer"
                        ? "border-mint-500 bg-mint-500/10"
                        : "border-border hover:border-mint-500/50"
                    )}
                  >
                    <ShoppingBag
                      className={cn(
                        "w-6 h-6 mb-2",
                        selectedRole === "buyer"
                          ? "text-mint-500"
                          : "text-muted-foreground"
                      )}
                    />
                    <p className="font-semibold">Collector</p>
                    <p className="text-xs text-muted-foreground">
                      Browse & buy art
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole("artist")}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all",
                      selectedRole === "artist"
                        ? "border-mint-500 bg-mint-500/10"
                        : "border-border hover:border-mint-500/50"
                    )}
                  >
                    <Brush
                      className={cn(
                        "w-6 h-6 mb-2",
                        selectedRole === "artist"
                          ? "text-mint-500"
                          : "text-muted-foreground"
                      )}
                    />
                    <p className="font-semibold">Artist</p>
                    <p className="text-xs text-muted-foreground">
                      Upload & sell art
                    </p>
                  </button>
                </div>
              </div>

              {/* OAuth Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={handleGoogleSignUp}
                  disabled={loading}
                  className="w-full"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Button>
                <Button
                  variant="outline"
                  onClick={handleAppleSignUp}
                  disabled={loading}
                  className="w-full"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
                    />
                  </svg>
                  Apple
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or continue with email
                  </span>
                </div>
              </div>

              {/* Email Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="Your name"
                      className="pl-10"
                      {...register("displayName")}
                    />
                  </div>
                  {errors.displayName && (
                    <p className="text-sm text-destructive">
                      {errors.displayName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10"
                      {...register("email")}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      className="pl-10 pr-10"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">
                      {errors.password.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Must contain uppercase, lowercase, and a number
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || loading}
                >
                  {isSubmitting ? "Creating account..." : "Create Account"}
                </Button>
              </form>

              {/* Terms */}
              <p className="text-center text-xs text-muted-foreground">
                By creating an account, you agree to our{" "}
                <Link href="/terms" className="text-mint-500 hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-mint-500 hover:underline">
                  Privacy Policy
                </Link>
              </p>

              {/* Sign In Link */}
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-mint-500 hover:underline font-medium"
                >
                  Sign in
                </Link>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

