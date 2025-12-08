import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true, // Disable image optimization to prevent 412 errors with Firebase Storage
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
