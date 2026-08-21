import path from "node:path";
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Pin the workspace root. Without this, Turbopack walks up and finds an
  // unrelated package-lock.json in the parent folder and treats that as the
  // project root.
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
};

export default nextConfig;

// Gives `next dev` the same Cloudflare bindings the deployed Worker gets
// (IMAGES today, KV/R2 if we add them), so local dev matches production.
// No-op outside dev.
initOpenNextCloudflareForDev();
