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

  experimental: {
    serverActions: {
      // The booking form uploads up to four house photos. The browser shrinks
      // them to ~300KB first, but a phone that cannot (old Safari, HEIC) sends
      // originals, capped at 6MB each by the action. Room for four of those.
      bodySizeLimit: "26mb",
    },
  },

  /*
   * Pages retired in the Nov 2026 relaunch. Permanent, so search engines move
   * their ranking across. Query strings (?src=) pass through untouched, so a
   * printed QR pointing at an old path still attributes.
   */
  redirects() {
    return [
      { source: "/contact", destination: "/", permanent: true },
      { source: "/reviews", destination: "/", permanent: true },
      { source: "/quote", destination: "/book", permanent: true },
      { source: "/bundles", destination: "/pricing", permanent: true },
      { source: "/services/patio-cleaning", destination: "/services", permanent: true },
      { source: "/services/gutter-guard", destination: "/gutter-guard", permanent: true },
    ];
  },
};

export default nextConfig;

// Gives `next dev` the same Cloudflare bindings the deployed Worker gets
// (IMAGES today, KV/R2 if we add them), so local dev matches production.
// No-op outside dev.
initOpenNextCloudflareForDev();
