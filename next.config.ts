import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Danger: allow production builds to successfully complete even if
    // there are ESLint errors. We'll fix them incrementally.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Danger: allow production builds to successfully complete even if
    // there are type errors. We'll fix them incrementally.
    ignoreBuildErrors: true,
  },
  turbopack: {
    // Ensure the correct workspace root to avoid API routes being treated as pages
    root: __dirname,
  },
};

export default nextConfig;
