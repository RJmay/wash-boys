import type { MetadataRoute } from "next";

import { BUSINESS } from "@/data/business";
import { SERVICES } from "@/data/services";
import { SUBURBS } from "@/data/suburbs";

const SITE = `https://${BUSINESS.domain}`;

/**
 * Sitemap (SPEC §9).
 *
 * /book and /go/[code] are deliberately absent: one is a form that would
 * compete with the landing page for the same terms, the other is a redirect.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: SITE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...SERVICES.filter((s) => s.active).map((s) => ({
      url: `${SITE}/services/${s.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...SUBURBS.map((s) => ({
      url: `${SITE}/areas/${s.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...["contact", "reviews", "privacy"].map((p) => ({
      url: `${SITE}/${p}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
