import type { MetadataRoute } from "next";

import { BUSINESS } from "@/data/business";
import { SERVICE_PAGES } from "@/data/services";
import { SUBURBS } from "@/data/suburbs";

const SITE = `https://${BUSINESS.domain}`;

/** /book is deliberately absent: it is a form, set to noindex. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly" | "yearly" = "monthly") => ({
    url: `${SITE}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });

  return [
    page("/", 1, "weekly"),
    page("/pricing", 0.9),
    page("/services", 0.8),
    ...SERVICE_PAGES.map((s) => page(`/services/${s.slug}`, 0.8)),
    page("/gutter-guard", 0.8),
    page("/areas", 0.7),
    // Suburb pages carry the next street days, so they change weekly.
    ...SUBURBS.map((s) => page(`/areas/${s.slug}`, s.priority ? 0.7 : 0.6, "weekly")),
    page("/how-it-works", 0.5),
    page("/faq", 0.5),
    page("/privacy", 0.2, "yearly"),
  ];
}
