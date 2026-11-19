import {
  DRIVEWAY_LARGEST,
  DRIVEWAY_OPTIONS,
  drivewaySizeName,
  formatPrice,
  getPricedService,
  isFromPrice,
  servicePriceLabel,
  type ServiceId,
} from "./pricing";
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

/** "1 or 2 cars $250. 3 cars $370. 4 cars (two wide, two long) $490." */
const drivewaySizes = DRIVEWAY_OPTIONS.map(
  (o) => `${drivewaySizeName(o)} ${formatPrice(o.price)}.`,
).join(" ");

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
      "Concrete or pavers, cleaned with a rotary surface cleaner for an even finish with no stripes. Oil stains pre-treated where possible.",
      `Priced by how many cars your driveway fits. ${drivewaySizes} Bigger than ${DRIVEWAY_LARGEST.cars} cars, we'll confirm the price by phone.`,
    ],
    includes: [
      "Driveway and paths",
      `Priced by size, 1 to ${DRIVEWAY_LARGEST.cars} cars`,
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
  /** True when `price` is where it starts. */
  from: boolean;
  /**
   * fixed: one price (single-storey). sized: a fixed price per size
   * (driveway, by cars). phone: a starting price confirmed by phone (fences).
   */
  basis: "fixed" | "sized" | "phone";
  /** The line beside the price: "1 or 2 cars, GST incl." */
  note: string;
} {
  const priced = getPricedService(page.pricingId);
  if (!priced) throw new Error(`pricing.json has no service "${page.pricingId}"`);
  const basis = priced.from ? "phone" : priced.sizes?.length ? "sized" : "fixed";
  return {
    name: priced.name,
    price: priced.price,
    label: servicePriceLabel(priced),
    from: isFromPrice(priced),
    basis,
    note:
      basis === "phone"
        ? "confirmed by phone, GST incl."
        : basis === "sized"
          ? `${priced.sizes?.[0]?.name ?? ""}, GST incl.`
          : "single-storey home, GST incl.",
  };
}

/** Not offered yet (business brief). Listed as "not yet" in the FAQ only. */
export const NOT_OFFERED = ["roof washing", "solar panel cleaning", "interior windows"] as const;
