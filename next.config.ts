import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.contentstack.*", // Allow all contentstack domains
      },
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      }
    ],
  },
  // Contentstack Launch compatible settings
  output: "standalone",
  
  // Ensure proper runtime configuration for serverless/edge functions
  experimental: {
    // Optimize for serverless deployment
    serverComponentsExternalPackages: ["pino", "pino-pretty"],
  },
};

export default nextConfig;

