import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'd2line.com',
      },
      {
        protocol: 'https',
        hostname: '**', // Allow any HTTPS hostname for flexibility
      },
    ],
  },
};

export default nextConfig;
