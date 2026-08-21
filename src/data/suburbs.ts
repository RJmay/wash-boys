/**
 * Service area: the Caloundra-Kawana-Buderim corridor. Sippy Downs and
 * Buderim in the north, down to Nirimba and Pelican Waters in the south,
 * coast and inland (CLAUDE.md).
 *
 * This list is the gate in three places:
 *  - the booking flow's suburb <select> - anything not here is an out-of-area
 *    lead, never a booking (SPEC §5 step 2);
 *  - /areas/[suburb] SEO pages, generated one per entry (SPEC §9);
 *  - the suburb chips on the landing page.
 *
 * `hook` is the grime/character line each area page is built around - what
 * actually dirties houses there. Keep them specific and true; they are the
 * only thing making 28 pages different from each other.
 *
 * TODO(launch): postcodes feed schema.org markup - spot-check them against
 * Australia Post before the SEO pages go live.
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
  hook: string;
};

export const SUBURBS: readonly Suburb[] = [
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
];

export const SUBURB_SLUGS = SUBURBS.map((s) => s.slug);

/** Alphabetical, for the booking flow's <select>. */
export const SUBURBS_ALPHABETICAL = [...SUBURBS].sort((a, b) =>
  a.name.localeCompare(b.name),
);

const BY_SLUG = new Map(SUBURBS.map((s) => [s.slug, s]));
const BY_NAME = new Map(SUBURBS.map((s) => [s.name.toLowerCase(), s]));

export function getSuburb(slug: string): Suburb | undefined {
  return BY_SLUG.get(slug);
}

/** True when we service this suburb - the out-of-area check (SPEC §5). */
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
