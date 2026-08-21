/**
 * Launch service catalogue - canonical for everything the customer sees:
 * landing cards, /services/[slug] pages, the booking flow and the live
 * estimate range.
 *
 * Mirrored into the `services` table by supabase/migrations/0001_init.sql so
 * admin joins and the Phase-2 quote engine can reference it by slug. If you
 * change a price here, change the seed there too - slug is the join key.
 *
 * Rules that must not be broken (CLAUDE.md):
 *  - Ranges only, never a fixed price. Final price is confirmed on site.
 *  - Gutter cleaning is never bookable and never carries a price until the
 *    owner is qualified for it.
 *  - Cold water only at launch - no steam/hot-water claims in copy.
 */

export const SERVICE_SLUGS = [
  "driveway-cleaning",
  "house-washing",
  "patio-cleaning",
  "fence-cleaning",
  "gutter-cleaning",
] as const;

export type ServiceSlug = (typeof SERVICE_SLUGS)[number];

/**
 * Rate card. Every number in this file traces back to here, so tuning a rate
 * is a one-line change.
 *
 * TODO(pricing): the driveway and house-wash anchors are confirmed business
 * facts (CLAUDE.md). The patio and fence rates below are trade-standard
 * starting points and need the owner's sign-off before flyers are printed.
 */
export const RATES = {
  /** Patios and paths are priced on area. ~$6-8/m2 with a minimum call-out. */
  patio: { perM2Low: 6, perM2High: 8, minimum: 99 },
  /**
   * Fences are priced on length, per side - the trade norm. The minimum
   * covers travel on a standalone visit; it is usually waived in practice
   * when the fence rides along with a house wash.
   */
  fence: { perLmLow: 8, perLmHigh: 11, minimum: 120 },
} as const;

/**
 * A size step the customer picks in the booking flow. Nobody knows their
 * patio in square metres, so every band leads with a plain-language hint and
 * treats the measurement as the fine print.
 */
export type PriceBand = {
  id: string;
  /** Short label for the option button. */
  label: string;
  /** What that size actually looks like, in the customer's terms. */
  hint: string;
  /** Lower unit bound, inclusive. */
  unitLow: number;
  /** Upper unit bound; null means open-ended. */
  unitHigh: number | null;
  priceLow: number;
  priceHigh: number;
  /**
   * Open-ended top band: too big to price sight-unseen, so it is quoted on
   * site and contributes nothing to the estimate range.
   */
  quoteOnly?: boolean;
};

export type Pricing =
  /** One range for the whole job (CLAUDE.md anchors). */
  | { kind: "flat"; low: number; high: number }
  /** Priced on size - the customer picks a band. */
  | {
      kind: "banded";
      unit: "m2" | "lm";
      /** Rendered next to the measurement, e.g. "m2". */
      unitLabel: string;
      /** The question the band selector asks. */
      prompt: string;
      bands: PriceBand[];
    }
  /** No price shown anywhere, ever, until the service is live. */
  | { kind: "unpriced" };

export type Service = {
  slug: ServiceSlug;
  /** Full name - headings, emails, admin. */
  name: string;
  /** Compact name for cards and chips on a 375px screen. */
  shortName: string;
  /** Card blurb: one line, the grime it removes. */
  blurb: string;
  /** Opening paragraph of the service page. */
  description: string;
  /** What the job includes - service page bullets. */
  includes: string[];
  pricing: Pricing;
  /**
   * This service is normally sold alongside another one. Fences ride along
   * with a house wash - the crew is already on site with the gear out - so
   * the booking flow offers it as an add-on the moment a house wash is
   * picked, as well as on its own card.
   */
  addOnTo?: ServiceSlug;
  /** Shown next to the add-on prompt. */
  addOnPrompt?: string;
  /** False = never selectable in the booking flow. */
  bookable: boolean;
  /** True = "coming soon" card that opens the waitlist instead of booking. */
  comingSoon: boolean;
  /** Shown/hidden site-wide without a deploy-time code change. */
  active: boolean;
  sort: number;
};

export const SERVICES: readonly Service[] = [
  {
    slug: "driveway-cleaning",
    name: "Driveway & concrete cleaning",
    shortName: "Driveways & concrete",
    blurb:
      "Oil spots, tyre marks, red dirt and black mould lifted off concrete, exposed aggregate and pavers.",
    description:
      "The fastest way to make a place look cared for again. We surface-clean the whole slab evenly - no zebra striping from a wand - then cut in the edges and rinse the run-off down the driveway rather than across your garden beds.",
    includes: [
      "Whole driveway, including the footpath crossover",
      "Even surface-cleaned finish, edges cut in by hand",
      "Oil and rust spots pre-treated where they will lift",
      "Run-off directed away from garden beds",
    ],
    /*
      Priced on area. It used to be a flat $150-350, which is right for a
      typical suburban driveway and ruinous beyond one: a 150m2 drive at the
      $350 ceiling works out at $35/hr, and 220m2 at $24/hr. Buderim's big
      blocks and the Meridan Plains acreage edges are on the wave-1 drop list,
      so those jobs will turn up. The $150 anchor is unchanged.
    */
    pricing: {
      kind: "banded",
      unit: "m2",
      unitLabel: "m2",
      prompt: "How much driveway and concrete?",
      bands: [
        {
          id: "single",
          label: "Single driveway",
          hint: "One car wide, up to the street",
          unitLow: 0,
          unitHigh: 40,
          priceLow: 150,
          priceHigh: 210,
        },
        {
          id: "double",
          label: "Double driveway",
          hint: "Two cars wide, or a single drive plus the front path",
          unitLow: 40,
          unitHigh: 75,
          priceLow: 210,
          priceHigh: 300,
        },
        {
          id: "large",
          label: "Driveway and paths",
          hint: "A long drive, or the drive plus paths down the side",
          unitLow: 75,
          unitHigh: 130,
          priceLow: 300,
          priceHigh: 470,
        },
        {
          id: "xl",
          label: "Bigger than that",
          hint: "Acreage or a very long drive. We will confirm on site",
          unitLow: 130,
          unitHigh: null,
          priceLow: 0,
          priceHigh: 0,
          quoteOnly: true,
        },
      ],
    },
    bookable: true,
    comingSoon: false,
    active: true,
    sort: 1,
  },
  {
    slug: "house-washing",
    name: "House soft wash",
    shortName: "House wash",
    blurb:
      "Low-pressure soft wash that takes mould and salt film off render, brick and weatherboard.",
    description:
      "Walls do not want high pressure - it drives water behind cladding and chews render. We soft wash instead: a low-pressure treatment that kills the mould rather than just blasting the top off it, then a gentle rinse. Single-storey homes at launch; two-storey is quote-only for now.",
    includes: [
      "Walls, eaves and downpipes",
      "Low-pressure soft wash - safe on render, brick and weatherboard",
      "Windows rinsed down after the walls",
      "Plants wet down before and after",
    ],
    /*
      Priced on wall area, but asked in the customer's terms - nobody knows
      their wall area. Same reason as the driveway: a flat $250-450 puts a
      300m2 wall at $58/hr. Two storey stays quote-only (SPEC §4.9). The $250
      anchor is unchanged.
    */
    pricing: {
      kind: "banded",
      unit: "m2",
      unitLabel: "m2 of wall",
      prompt: "What sort of house is it?",
      bands: [
        {
          id: "small",
          label: "Small lowset",
          hint: "Three bedrooms, single storey",
          unitLow: 0,
          unitHigh: 150,
          priceLow: 250,
          priceHigh: 330,
        },
        {
          id: "typical",
          label: "Typical family home",
          hint: "Four bedrooms, single storey",
          unitLow: 150,
          unitHigh: 200,
          priceLow: 330,
          priceHigh: 420,
        },
        {
          id: "large",
          label: "Large or long",
          hint: "A big single-storey home, or one that runs down the block",
          unitLow: 200,
          unitHigh: 260,
          priceLow: 420,
          priceHigh: 550,
        },
        {
          id: "two-storey",
          label: "Two storey",
          hint: "Quote only for now - we will price it from a couple of photos",
          unitLow: 260,
          unitHigh: null,
          priceLow: 0,
          priceHigh: 0,
          quoteOnly: true,
        },
      ],
    },
    bookable: true,
    comingSoon: false,
    active: true,
    sort: 2,
  },
  {
    slug: "patio-cleaning",
    name: "Patios, paths & pool surrounds",
    shortName: "Patios & paths",
    blurb:
      "Entertaining areas, garden paths and pool edges - the places that go green first.",
    description:
      "Shaded pavers and pool surrounds hold moisture, so they green up long before the driveway does. We clean them back to the original colour and keep the pressure off the jointing sand. Priced on area, so a courtyard never pays for a full entertaining deck.",
    includes: [
      "Patios, alfresco areas and garden paths",
      "Pool surrounds and coping",
      "Pressure matched to the surface so jointing sand stays put",
      "Furniture moved and put back",
    ],
    pricing: {
      kind: "banded",
      unit: "m2",
      unitLabel: "m2",
      prompt: "Roughly how big is the area?",
      bands: [
        {
          id: "small",
          label: "Small",
          hint: "A courtyard, a small patio or a front path",
          unitLow: 0,
          unitHigh: 15,
          priceLow: 99,
          priceHigh: 150,
        },
        {
          id: "medium",
          label: "Medium",
          hint: "A typical patio, or a path running down one side",
          unitLow: 15,
          unitHigh: 35,
          priceLow: 150,
          priceHigh: 250,
        },
        {
          id: "large",
          label: "Large",
          hint: "A big entertaining area, or a pool surround",
          unitLow: 35,
          unitHigh: 60,
          priceLow: 250,
          priceHigh: 400,
        },
        {
          id: "xl",
          label: "Bigger than that",
          hint: "We will confirm the price on site before starting",
          unitLow: 60,
          unitHigh: null,
          priceLow: 0,
          priceHigh: 0,
          quoteOnly: true,
        },
      ],
    },
    bookable: true,
    comingSoon: false,
    active: true,
    sort: 3,
  },
  {
    slug: "fence-cleaning",
    name: "Fences & retaining walls",
    shortName: "Fences & retaining",
    blurb:
      "Colorbond, timber and besser block brought back from green and grey.",
    description:
      "Fences are priced by the metre, the way the trade does it. Most of ours go out with a house wash - the gear is already set up and the fence is the first thing you see from the street - but we will do one on its own too.",
    includes: [
      "Colorbond, timber and besser block",
      "Retaining walls and garden edging",
      "Priced per metre, per side",
      "Best value added to a house wash while we are on site",
    ],
    pricing: {
      kind: "banded",
      unit: "lm",
      unitLabel: "m",
      prompt: "Roughly how much fence?",
      bands: [
        {
          id: "short",
          label: "Short",
          hint: "One boundary, or a front fence and gate",
          unitLow: 0,
          unitHigh: 15,
          priceLow: 120,
          priceHigh: 180,
        },
        {
          id: "medium",
          label: "Medium",
          hint: "Two boundaries, or a long side fence",
          unitLow: 15,
          unitHigh: 30,
          priceLow: 180,
          priceHigh: 300,
        },
        {
          id: "long",
          label: "Long",
          hint: "The whole block, or a corner block",
          unitLow: 30,
          unitHigh: 50,
          priceLow: 300,
          priceHigh: 450,
        },
        {
          id: "xl",
          label: "More than that",
          hint: "We will confirm the price on site before starting",
          unitLow: 50,
          unitHigh: null,
          priceLow: 0,
          priceHigh: 0,
          quoteOnly: true,
        },
      ],
    },
    addOnTo: "house-washing",
    addOnPrompt: "Add the fences while we are there?",
    bookable: true,
    comingSoon: false,
    active: true,
    sort: 4,
  },
  {
    slug: "gutter-cleaning",
    name: "Gutter cleaning",
    shortName: "Gutters",
    blurb:
      "Coming soon - join the waitlist and we will call you first when it goes live.",
    description:
      "We are getting set up for gutter cleaning ahead of storm season. It is not bookable yet and we will not quote it until it is - leave your number and you will be first on the list.",
    includes: [],
    // No pricing anywhere until the service is live (CLAUDE.md).
    pricing: { kind: "unpriced" },
    bookable: false,
    comingSoon: true,
    active: true,
    sort: 5,
  },
];

/**
 * Add-ons offered on the day, not standalone bookings. No price anchors exist
 * for these yet, so none are shown.
 */
export const ADD_ONS = [
  { slug: "wheelie-bins", name: "Wheelie bin clean" },
  { slug: "letterbox", name: "Letterbox clean" },
] as const;

const BY_SLUG = new Map(SERVICES.map((s) => [s.slug, s]));

export function getService(slug: string): Service | undefined {
  return BY_SLUG.get(slug as ServiceSlug);
}

export function isServiceSlug(slug: string): slug is ServiceSlug {
  return BY_SLUG.has(slug as ServiceSlug);
}

/** Cards shown in the booking flow as selectable. */
export const BOOKABLE_SERVICES = SERVICES.filter((s) => s.active && s.bookable);

/** Cards shown greyed with a waitlist CTA. */
export const COMING_SOON_SERVICES = SERVICES.filter(
  (s) => s.active && s.comingSoon,
);

/** True when the customer must pick a size before we can estimate. */
export function isBanded(
  service: Service,
): service is Service & { pricing: Extract<Pricing, { kind: "banded" }> } {
  return service.pricing.kind === "banded";
}

export function getBand(
  service: Service,
  bandId: string,
): PriceBand | undefined {
  return isBanded(service)
    ? service.pricing.bands.find((b) => b.id === bandId)
    : undefined;
}

/** Bands that carry a number. The open-ended top band never does. */
function pricedBands(service: Service): PriceBand[] {
  return isBanded(service)
    ? service.pricing.bands.filter((b) => !b.quoteOnly)
    : [];
}

/**
 * Widest range the service can span, used before a size is picked and on the
 * service page. Zero/zero when the service carries no price at all.
 */
export function serviceRange(service: Service): { low: number; high: number } {
  const { pricing } = service;
  if (pricing.kind === "flat") return { low: pricing.low, high: pricing.high };
  if (pricing.kind === "unpriced") return { low: 0, high: 0 };

  const bands = pricedBands(service);
  if (bands.length === 0) return { low: 0, high: 0 };
  return {
    low: Math.min(...bands.map((b) => b.priceLow)),
    high: Math.max(...bands.map((b) => b.priceHigh)),
  };
}

/** The "from $X" anchor on cards and the flyer. 0 means show no price. */
export function serviceFromPrice(service: Service): number {
  return serviceRange(service).low;
}

/** True when this service shows a price anywhere. */
export function isPriced(service: Service): boolean {
  return service.pricing.kind !== "unpriced";
}

/** Services offered as an add-on to the given service, e.g. fences to a house wash. */
export function addOnsFor(slug: ServiceSlug): Service[] {
  return BOOKABLE_SERVICES.filter((s) => s.addOnTo === slug);
}
