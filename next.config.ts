import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse is CJS-only and Node-specific; keep it out of the Turbopack
  // ESM bundle so Next.js uses Node's require() path instead.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
