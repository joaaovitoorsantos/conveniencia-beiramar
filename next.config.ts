import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  images: {
    domains: ['i.imgur.com'],
  },
  experimental: {
    appDir: false,
  },
};

export default nextConfig;
