import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["geist"],
  trailingSlash: true,
  images: {
    unoptimized: true, 
  },
};

export default nextConfig;