import type { MetadataRoute } from "next";

import { BUSINESS } from "@/data/business";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The booking form and the QR redirect have nothing to index, and
      // crawling /go/ would log scans that never happened.
      disallow: ["/book", "/go/"],
    },
    sitemap: `https://${BUSINESS.domain}/sitemap.xml`,
  };
}
