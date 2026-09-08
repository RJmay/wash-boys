import type { MetadataRoute } from "next";

import { BUSINESS } from "@/data/business";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The booking form has nothing to index.
      disallow: ["/book"],
    },
    sitemap: `https://${BUSINESS.domain}/sitemap.xml`,
  };
}
