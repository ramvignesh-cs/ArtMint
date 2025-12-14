import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Twitter, Instagram, Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-gallery-dark">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo.png"
                alt="ArtMint Logo"
                width={42}
                height={42}
                className="w-8 h-8 logo-mint"
              />
              <span className="text-xl font-bold">
                Art<span className="text-mint-500">Mint</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Own the Digital Original. The first marketplace where buying
              digital art truly makes it yours.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="text-muted-foreground hover:text-mint-500 transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-mint-500 transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-mint-500 transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Marketplace */}
          <div className="space-y-4">
            <h4 className="font-semibold">Marketplace</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/gallery"
                  className="text-sm text-muted-foreground hover:text-mint-500 transition-colors"
                >
                  Browse Art
                </Link>
              </li>
              <li>
                <Link
                  href="/artists"
                  className="text-sm text-muted-foreground hover:text-mint-500 transition-colors"
                >
                  Artists
                </Link>
              </li>
              <li>
                <Link
                  href="/categories"
                  className="text-sm text-muted-foreground hover:text-mint-500 transition-colors"
                >
                  Categories
                </Link>
              </li>
            </ul>
          </div>

          {/* For Artists */}
          <div className="space-y-4">
            <h4 className="font-semibold">For Artists</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/artist/upload"
                  className="text-sm text-muted-foreground hover:text-mint-500 transition-colors"
                >
                  Sell Your Art
                </Link>
              </li>
              <li>
                <Link
                  href="/signup?role=artist"
                  className="text-sm text-muted-foreground hover:text-mint-500 transition-colors"
                >
                  Become an Artist
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-sm text-muted-foreground hover:text-mint-500 transition-colors"
                >
                  Artist FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h4 className="font-semibold">Company</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about"
                  className="text-sm text-muted-foreground hover:text-mint-500 transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-muted-foreground hover:text-mint-500 transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-muted-foreground hover:text-mint-500 transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()}{" "}
              <span className="text-mint-500 font-medium">ArtMint</span>. All
              rights reserved.
            </p>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <p className="text-sm text-muted-foreground">
                Art. Owned. Forever.
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Made from Chennai</span>
                <span className="hidden md:inline">•</span>
                <span>
                  Powered by{" "}
                  <a
                    href="https://www.contentstack.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-mint-500 hover:text-mint-400 transition-colors font-medium"
                  >
                    Contentstack
                  </a>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
