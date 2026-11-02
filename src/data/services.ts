import { formatPrice, getPricedService, servicePriceLabel, type ServiceId } from "./pricing";
import type { PhotoService } from "./site";

/**
 * Service pages: the copy for each cleaning service, keyed to its price in
 * pricing.json. Prices are never written here - they come from the JSON via
 * `pricingId`, so changing a price is a one-file job.
 *
 * Gutter guard is not in this list: it is priced by package and has its own
 * page at /gutter-guard.
 *
 * Copy is from docs/brief/site-content.md. Keep to what is true - no claims
 * about insurance, licences or experience.
 */

export type ServicePage = {
  /** URL slug under /services. Kept stable for SEO. */
  slug: string;
  pricingId: ServiceId;
  /** Search phrase the page targets, e.g. "house washing". */
  keyword: string;
  /** H1. */
  heading: string;
  /** Opening paragraphs. */
  body: string[];
  includes: string[];
  photoService: PhotoService;
};

const driveway = getPricedService("driveway");
const includedArea = driveway?.includedArea_m2 ?? 0;
const extraPerM2 = driveway?.extraPerM2 ?? 0;

export const SERVICE_PAGES: readonly ServicePage[] = [
  {
    slug: "house-washing",
    pricingId: "house-wash",
    keyword: "house washing",
    heading: "House soft washing",
    body: [
      "Mould, salt and grime come off with a low-pressure wash and a cleaning solution that kills mould at the root, so your paint and render aren't damaged and the clean lasts longer.",
      "Safe on paint, render, brick, weatherboard and Colorbond. We wet your garden beds before and after so plants are protected.",
    ],
    includes: [
      "Walls, eaves, frames and entry",
      "Low pressure with a cleaning solution, never blasted",
      "Garden beds wet down before and after",
    ],
    photoService: "house-wash",
  },
  {
    slug: "driveway-cleaning",
    pricingId: "driveway",
    keyword: "pressure cleaning",
    heading: "Driveway and path pressure cleaning",
    body: [
      `Up to ${includedArea} m² of concrete or pavers, cleaned with a rotary surface cleaner for an even finish with no stripes.`,
      `Extra area ${formatPrice(extraPerM2)} per m². Oil stains pre-treated where possible.`,
    ],
    includes: [
      `Driveway and paths, up to ${includedArea} m²`,
      "Rotary surface cleaner for an even finish",
      "Oil stains pre-treated where possible",
    ],
    photoService: "driveway",
  },
  {
    slug: "gutter-cleaning",
    pricingId: "gutter-clean",
    keyword: "gutter cleaning",
    heading: "Gutter cleaning",
    body: [
      "Gutters cleared by hand, debris bagged and taken away, downpipes flushed. We send you photos of what came out.",
    ],
    includes: [
      "Gutters cleared by hand",
      "Debris bagged and taken away",
      "Downpipes flushed",
      "Photos of what came out",
    ],
    photoService: "gutter-clean",
  },
  {
    slug: "window-cleaning",
    pricingId: "windows",
    keyword: "window cleaning",
    heading: "Exterior window cleaning",
    body: [
      "All outside glass cleaned, frames wiped, screens rinsed. Done after the house wash so no spots are left behind.",
    ],
    includes: [
      "All outside glass",
      "Frames wiped",
      "Screens rinsed",
    ],
    photoService: "windows",
  },
  {
    slug: "fence-cleaning",
    pricingId: "fences",
    keyword: "fence cleaning",
    heading: "Fence and retaining wall cleaning",
    body: [
      "Colorbond, timber and besser block brought back from green and grey. Priced per metre, per side, the way the trade does it.",
      "Best value added to a house wash: we're already on site with the gear out. We'll confirm the price by phone before the day.",
    ],
    includes: [
      "Colorbond, timber and besser block",
      "Retaining walls and garden edging",
      "Priced per metre, per side",
      "Add it to any bundle or house wash",
    ],
    photoService: "fences",
  },
];

export function getServicePage(slug: string): ServicePage | undefined {
  return SERVICE_PAGES.find((s) => s.slug === slug);
}

export function servicePageFor(id: ServiceId): ServicePage | undefined {
  return SERVICE_PAGES.find((s) => s.pricingId === id);
}

/** Name and price for a service page, straight from pricing.json. */
export function servicePrice(page: ServicePage): {
  name: string;
  price: number;
  /** "$450" or "from $120". */
  label: string;
  from: boolean;
} {
  const priced = getPricedService(page.pricingId);
  if (!priced) throw new Error(`pricing.json has no service "${page.pricingId}"`);
  return {
    name: priced.name,
    price: priced.price,
    label: servicePriceLabel(priced),
    from: Boolean(priced.from),
  };
}

/** Not offered yet (business brief). Listed as "not yet" in the FAQ only. */
export const NOT_OFFERED = ["roof washing", "solar panel cleaning", "interior windows"] as const;
