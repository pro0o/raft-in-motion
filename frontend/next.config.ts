import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["geist"],
  output: 'export',  
  trailingSlash: true,
};

export default nextConfig;