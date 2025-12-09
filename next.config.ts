import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: Using server mode for Capacitor because app has dynamic routes
  // Static export would require generateStaticParams() for all dynamic routes
  images: {
    unoptimized: true, // Keep unoptimized for mobile performance
    remotePatterns: [
      // existing allowed domains
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
        pathname: "/**",
      },

      //  Firebase Storage (old domain)
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        port: "",
        pathname: "/v0/b/**",
      },

      //  Firebase Storage (new domain)
      {
        protocol: "https",
        hostname: "*.firebasestorage.app",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
