import areas from "./service-areas.json";

/**
 * Service area: the original 28-suburb Caloundra-Kawana-Buderim corridor, plus
 * Kuluin and Forest Glen.
 *
 * Two sources, merged here so nothing else has to care:
 *  - this file holds every suburb we serve, with its postcode, region and
 *    `hook` (what actually dirties houses there);
 *  - service-areas.json holds the flyer-priority suburbs, in drop order, with
 *    the owner's own local blurb. Where a suburb has a blurb it leads the
 *    suburb page; the hook follows as the second paragraph.
 *
 * This list is the gate in three places:
 *  - the booking form's suburb <select> - "Other" becomes an enquiry, never a
 *    booking;
 *  - /areas/[suburb] SEO pages, generated one per entry;
 *  - LocalBusiness `areaServed` in the structured data.
 *
 * Next booking dates per suburb live in street-days.json, not here.
 */

export type SuburbTier = 1 | 2 | 3;

export type SuburbRegion = "Caloundra" | "Aura" | "Kawana" | "Buderim";

export type Suburb = {
  slug: string;
  name: string;
  postcode: string;
  region: SuburbRegion;
  /**
   * Flyer drop priority from FLYER_BRIEF.md, not a service-quality ranking:
   * 1 premium (highest tickets), 2 volume/home turf, 3 filler.
   */
  tier: SuburbTier;
  /** What dirties houses here. Absent for suburbs that only have a blurb. */
  hook?: string;
  /** Owner's blurb from service-areas.json, when the suburb is listed there. */
  blurb?: string;
  /** Flyer priority from service-areas.json (1 = first). Undefined = unranked. */
  priority?: number;
};

const CORRIDOR: readonly Suburb[] = [
  // Caloundra
  {
    slug: "pelican-waters",
    name: "Pelican Waters",
    postcode: "4551",
    region: "Caloundra",
    tier: 1,
    hook: "Canal-front render carries a constant salt film, and the big exposed-aggregate driveways show every oil drop.",
  },
  {
    slug: "golden-beach",
    name: "Golden Beach",
    postcode: "4551",
    region: "Caloundra",
    tier: 2,
    hook: "Passage winds push salt straight onto west-facing walls, and the older low-set brick homes green up on the shaded side.",
  },
  {
    slug: "caloundra",
    name: "Caloundra",
    postcode: "4551",
    region: "Caloundra",
    tier: 2,
    hook: "Seventies brick and new builds a block apart, all of it a short walk from salt water - salt on the walls, mould anywhere the sun misses.",
  },
  {
    slug: "kings-beach",
    name: "Kings Beach",
    postcode: "4551",
    region: "Caloundra",
    tier: 2,
    hook: "Full beachfront exposure, tight driveways and rendered walls holding salt spray all year.",
  },
  {
    slug: "shelly-beach",
    name: "Shelly Beach",
    postcode: "4551",
    region: "Caloundra",
    tier: 1,
    hook: "Quiet headland streets where sea mist settles on render and the paths stay damp under the pines.",
  },
  {
    slug: "moffat-beach",
    name: "Moffat Beach",
    postcode: "4551",
    region: "Caloundra",
    tier: 1,
    hook: "Renovated cottages on steep driveways - salt air on fresh render, moss on everything the headland keeps in shade.",
  },
  {
    slug: "dicky-beach",
    name: "Dicky Beach",
    postcode: "4551",
    region: "Caloundra",
    tier: 1,
    hook: "Beach streets under coastal scrub: leaf litter, black mould along the eaves and green paths behind the dunes.",
  },
  {
    slug: "battery-hill",
    name: "Battery Hill",
    postcode: "4551",
    region: "Caloundra",
    tier: 2,
    hook: "Elevated eighties and nineties brick homes with long sloping driveways that streak with red dirt after a storm.",
  },
  {
    slug: "currimundi",
    name: "Currimundi",
    postcode: "4551",
    region: "Caloundra",
    tier: 2,
    hook: "Lake humidity plus mature trees - green concrete, mossy pool surrounds and mould on the shaded walls.",
  },
  {
    slug: "aroona",
    name: "Aroona",
    postcode: "4551",
    region: "Caloundra",
    tier: 2,
    hook: "Our home suburb. Solid eighties brick, wide concrete driveways and enough tree cover to keep the mould coming back.",
  },
  {
    slug: "little-mountain",
    name: "Little Mountain",
    postcode: "4551",
    region: "Caloundra",
    tier: 2,
    hook: "Big elevated blocks with long driveways and retaining walls that go green along the low side.",
  },
  {
    slug: "caloundra-west",
    name: "Caloundra West",
    postcode: "4551",
    region: "Caloundra",
    tier: 3,
    hook: "Newer estate homes where pale driveways show red dirt and tyre marks within a season.",
  },
  {
    slug: "meridan-plains",
    name: "Meridan Plains",
    postcode: "4551",
    region: "Caloundra",
    tier: 2,
    hook: "Estate homes and acreage edges backing onto bush - leaf drop, debris and mould on the shaded elevations.",
  },

  // Aura and Baringa (newer inland estates)
  {
    slug: "nirimba",
    name: "Nirimba",
    postcode: "4551",
    region: "Aura",
    tier: 3,
    hook: "New Aura homes with pale driveways and rendered walls - construction dust and red dirt turn up early here.",
  },
  {
    slug: "baringa",
    name: "Baringa",
    postcode: "4551",
    region: "Aura",
    tier: 3,
    hook: "Newer builds close to the bush buffer, picking up fine dust and mould on the southern walls.",
  },
  {
    slug: "banya",
    name: "Banya",
    postcode: "4551",
    region: "Aura",
    tier: 3,
    hook: "The newest Aura release - light render and fresh concrete that mark up quickly while the estate is still building around them.",
  },
  {
    slug: "bells-creek",
    name: "Bells Creek",
    postcode: "4551",
    region: "Aura",
    tier: 3,
    hook: "Bush-fringe blocks where leaf litter and damp keep paths and fences green.",
  },

  // Kawana coast
  {
    slug: "wurtulla",
    name: "Wurtulla",
    postcode: "4575",
    region: "Kawana",
    tier: 2,
    hook: "Beach-side streets behind the dunes - salt film on the walls and sand-scoured concrete underfoot.",
  },
  {
    slug: "bokarina",
    name: "Bokarina",
    postcode: "4575",
    region: "Kawana",
    tier: 2,
    hook: "New beachside builds mixed through older stock, all of it taking salt straight off the open beach.",
  },
  {
    slug: "birtinya",
    name: "Birtinya",
    postcode: "4575",
    region: "Kawana",
    tier: 3,
    hook: "Island estate homes built close together - narrow driveways, rendered walls and canal humidity.",
  },
  {
    slug: "warana",
    name: "Warana",
    postcode: "4575",
    region: "Kawana",
    tier: 2,
    hook: "Original beach shacks beside rebuilt homes, one street from the sand, with salt on every east-facing wall.",
  },
  {
    slug: "buddina",
    name: "Buddina",
    postcode: "4575",
    region: "Kawana",
    tier: 1,
    hook: "The Point Cartwright end - large rendered homes, heavy salt spray and exposed-aggregate driveways worth doing properly.",
  },
  {
    slug: "minyama",
    name: "Minyama",
    postcode: "4575",
    region: "Kawana",
    tier: 1,
    hook: "Canal-front houses where salt air sits on the render and pool surrounds green up in the shade.",
  },
  {
    slug: "parrearra",
    name: "Parrearra",
    postcode: "4575",
    region: "Kawana",
    tier: 2,
    hook: "Canal and lake frontage means constant moisture - green retaining walls and mould down the shaded side of the render.",
  },

  // Buderim and the northern edge of the corridor
  {
    slug: "mountain-creek",
    name: "Mountain Creek",
    postcode: "4557",
    region: "Buderim",
    tier: 2,
    hook: "Established homes under mature trees at the foot of Buderim - leaf drop, mossy paths and gutters that fill fast.",
  },
  {
    slug: "buderim",
    name: "Buderim",
    postcode: "4556",
    region: "Buderim",
    tier: 1,
    hook: "Big blocks under heavy tree cover on the mountain: moss on the driveway, mould on the render and gutters that fill every season.",
  },
  {
    slug: "sippy-downs",
    name: "Sippy Downs",
    postcode: "4556",
    region: "Buderim",
    tier: 3,
    hook: "University-side estates - the established pockets carry the tree shade and the green concrete, the newer streets less so.",
  },
  {
    slug: "palmview",
    name: "Palmview",
    postcode: "4553",
    region: "Buderim",
    tier: 3,
    hook: "Harmony estate homes bordering bush and creek flats - pale driveways, fresh render and plenty of dust.",
  },

  // North of Buderim, added Nov 2026 with the exterior-services relaunch.
  // No hook yet - their pages lead with the blurb in service-areas.json.
  {
    slug: "forest-glen",
    name: "Forest Glen",
    postcode: "4556",
    region: "Buderim",
    tier: 2,
  },
  {
    slug: "kuluin",
    name: "Kuluin",
    postcode: "4558",
    region: "Buderim",
    tier: 2,
  },
];

type AreaEntry = (typeof areas.areas)[number];
const LISTED = new Map<string, AreaEntry>(areas.areas.map((a) => [a.slug, a]));

/**
 * Every suburb, priority suburbs first in drop order, then the rest of the
 * corridor in its original order.
 */
export const SUBURBS: readonly Suburb[] = CORRIDOR.map((suburb) => {
  const listed = LISTED.get(suburb.slug);
  return listed
    ? { ...suburb, postcode: listed.postcode, blurb: listed.blurb, priority: listed.priority }
    : suburb;
}).sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

/** The suburbs in service-areas.json, in priority order. */
export const PRIORITY_SUBURBS = SUBURBS.filter((s) => s.priority !== undefined);

/** Lead paragraph for a suburb page: the owner's blurb, else the hook. */
export function suburbIntro(suburb: Suburb): string {
  return suburb.blurb ?? suburb.hook ?? "";
}

export const SUBURB_SLUGS = SUBURBS.map((s) => s.slug);

/** Alphabetical, for the booking form's <select>. */
export const SUBURBS_ALPHABETICAL = [...SUBURBS].sort((a, b) =>
  a.name.localeCompare(b.name),
);

const BY_SLUG = new Map(SUBURBS.map((s) => [s.slug, s]));
const BY_NAME = new Map(SUBURBS.map((s) => [s.name.toLowerCase(), s]));

export function getSuburb(slug: string): Suburb | undefined {
  return BY_SLUG.get(slug);
}

/** True when we service this suburb - anything else is an enquiry. */
export function isServicedSuburb(slug: string): boolean {
  return BY_SLUG.has(slug);
}

/** Tolerant lookup for pasted or typed suburb names. */
export function findSuburbByName(name: string): Suburb | undefined {
  return BY_NAME.get(name.trim().toLowerCase());
}

export const REGIONS: readonly SuburbRegion[] = [
  "Caloundra",
  "Aura",
  "Kawana",
  "Buderim",
];

export function suburbsInRegion(region: SuburbRegion): Suburb[] {
  return SUBURBS.filter((s) => s.region === region);
}
