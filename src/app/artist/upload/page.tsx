"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Upload,
  X,
  Image as ImageIcon,
  DollarSign,
  Tag,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { useAuth, useRequireAuth, useRequireRole } from "@/context/AuthContext";
import { publishArtworkSchema, type PublishArtworkInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/useToast";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { cn } from "@/lib/utils";

const categories = [
  "Abstract",
  "Landscape",
  "Portrait",
  "Urban",
  "Nature",
  "Fantasy",
  "Minimalist",
  "Surreal",
  "Digital Art",
  "Photography",
];

export default function ArtistUploadPage() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const { loading: authLoading } = useRequireAuth();
  useRequireRole("artist", "/");

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PublishArtworkInput>({
    resolver: zodResolver(publishArtworkSchema),
    defaultValues: {
      category: "",
      price: 0,
      tags: [],
    },
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB.",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
  };

  const addTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
      const newTags = [...tags, trimmed];
      setTags(newTags);
      setValue("tags", newTags);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(newTags);
    setValue("tags", newTags);
  };

  const onSubmit = async (data: PublishArtworkInput) => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select an image to upload.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Get Firebase auth token
      if (!user) {
        throw new Error("Authentication required. Please sign in again.");
      }
      const authToken = await user.getIdToken();

      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", data.title);
      formData.append("description", data.description || "");
      formData.append("category", data.category);
      formData.append("price", data.price.toString());
      formData.append("currency", "USD"); // Default currency
      formData.append("status", "sale"); // New uploads are for sale
      formData.append("tags", JSON.stringify(tags));

      const response = await fetch("/api/assets/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to upload artwork");
      }

      toast({
        title: "Artwork published!",
        description: "Your artwork is now live on the marketplace.",
        variant: "success",
      });

      router.push(`/art/${result.asset.uid}`);
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (authLoading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-gallery-dark">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <h1 className="text-4xl font-bold mb-4">
              Upload Your <span className="text-mint-500">Artwork</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Share your digital masterpiece with the world
            </p>
          </motion.div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* File Upload */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-mint-500" />
                      Artwork Image
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {preview ? (
                      <div className="relative aspect-square rounded-xl overflow-hidden">
                        <Image
                          src={preview}
                          alt="Preview"
                          fill
                          className="object-cover"
                        />
                        <button
                          type="button"
                          onClick={removeFile}
                          className="absolute top-3 right-3 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                          <p className="text-sm font-medium truncate">
                            {file?.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(file?.size ? file.size / 1024 / 1024 : 0).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "relative aspect-square rounded-xl border-2 border-dashed transition-colors cursor-pointer",
                          dragActive
                            ? "border-mint-500 bg-mint-500/10"
                            : "border-border hover:border-mint-500/50"
                        )}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() =>
                          document.getElementById("file-input")?.click()
                        }
                      >
                        <input
                          id="file-input"
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleFileSelect(e.target.files[0]);
                            }
                          }}
                          className="hidden"
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                          <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                          <p className="font-medium mb-1">
                            Drop your artwork here
                          </p>
                          <p className="text-sm text-muted-foreground mb-4">
                            or click to browse
                          </p>
                          <p className="text-xs text-muted-foreground">
                            PNG, JPG, GIF up to 10MB
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Artwork Details */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Artwork Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Title */}
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        placeholder="Give your artwork a name"
                        {...register("title")}
                      />
                      {errors.title && (
                        <p className="text-sm text-destructive">
                          {errors.title.message}
                        </p>
                      )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <textarea
                        id="description"
                        rows={4}
                        placeholder="Tell the story behind your artwork..."
                        className="flex w-full rounded-lg border border-input bg-card px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-500/50 focus-visible:border-mint-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
                        {...register("description")}
                      />
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                      <Label>Category *</Label>
                      <Select
                        onValueChange={(value) => setValue("category", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.category && (
                        <p className="text-sm text-destructive">
                          {errors.category.message}
                        </p>
                      )}
                    </div>

                    {/* Price */}
                    <div className="space-y-2">
                      <Label htmlFor="price">Price (USD) *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="price"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="pl-10"
                          {...register("price", { valueAsNumber: true })}
                        />
                      </div>
                      {errors.price && (
                        <p className="text-sm text-destructive">
                          {errors.price.message}
                        </p>
                      )}
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                      <Label>Tags (optional)</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="Add a tag"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addTag();
                              }
                            }}
                            className="pl-10"
                          />
                        </div>
                        <Button type="button" variant="outline" onClick={addTag}>
                          Add
                        </Button>
                      </div>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-mint-500/10 text-mint-500 border border-mint-500/20"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="ml-2 hover:text-mint-300"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {10 - tags.length} tags remaining
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Submit */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={uploading || !file}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Publish Artwork
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By publishing, you confirm this is your original work and agree
                  to our{" "}
                  <a href="/terms" className="text-mint-500 hover:underline">
                    Terms of Service
                  </a>
                </p>
              </motion.div>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}

