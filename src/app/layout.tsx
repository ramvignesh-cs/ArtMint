import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ArtMint | Own the Digital Original",
  description:
    "The first marketplace where buying digital art truly makes it yours. Browse, collect, and showcase your digital art collection.",
  keywords: [
    "digital art",
    "NFT alternative",
    "art marketplace",
    "digital ownership",
    "art collection",
  ],
  authors: [{ name: "ArtMint" }],
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "ArtMint | Own the Digital Original",
    description:
      "The first marketplace where buying digital art truly makes it yours.",
    type: "website",
    siteName: "ArtMint",
    images: ["/icon.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "ArtMint | Own the Digital Original",
    description:
      "The first marketplace where buying digital art truly makes it yours.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}

