import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root. Without this, Turbopack walks up and finds an
  // unrelated package-lock.json in the parent folder and treats that as the
  // project root.
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
};

export default nextConfig;
