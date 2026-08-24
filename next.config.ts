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

  /*
   * Dev only. Next treats 127.0.0.1 as a different origin from localhost and
   * serves 403 for /_next/static/* across it — the page still renders, because
   * the HTML is server-side, but no client JS loads and nothing hydrates. That
   * failure looks like broken interactivity rather than a blocked request, so
   * allow the loopback address explicitly.
   */
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;

// Gives `next dev` the same Cloudflare bindings the deployed Worker gets
// (IMAGES today, KV/R2 if we add them), so local dev matches production.
// No-op outside dev.
initOpenNextCloudflareForDev();
