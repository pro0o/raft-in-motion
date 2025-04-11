import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["geist"],
  output: 'export',  
  trailingSlash: true,
  images: {
    unoptimized: true, 
  },
};

export default nextConfig;