/**
 * Switches for content that depends on assets we do not have yet.
 *
 * The hard rule behind all of this (CLAUDE.md, SPEC §2): real photos of our
 * own work only. No stock before/afters, no borrowed reviews. Until the first
 * driveways are done in soft-launch week, the page shows an honest empty state
 * instead of a fake one.
 */

/**
 * Per-image framing tweak, so a before and after shot from slightly different
 * positions still line up under the wipe.
 *
 * A slider only works if the two frames match. When they do not, scale the
 * wider shot up and anchor it to the side with the spare margin - it crops
 * off-screen and sits underneath, so the size difference never shows at the
 * wipe line. Fixed points (a mailbox, a downpipe, a window edge) are what you
 * align against.
 */
export type ImageAdjust = {
  /** CSS object-position, e.g. "70% 50%" - which part survives the crop. */
  position?: string;
  /** Zoom, e.g. 1.08. Anchored by `origin`. */
  scale?: number;
  /** CSS transform-origin for the scale, e.g. "right center". */
  origin?: string;
};

export type BeforeAfterPair = {
  /** Path under /public, or a Supabase Storage URL. */
  before: string;
  after: string;
  /** What the photo actually shows - used as alt text. */
  alt: string;
  /** Where the job was, e.g. "Pelican Waters". Proof it is local. */
  suburb?: string;
  /** True for layout stand-ins, so the caption never claims it is our work. */
  placeholder?: boolean;
  /** Framing corrections applied per side. Omit when the shots already match. */
  adjust?: { before?: ImageAdjust; after?: ImageAdjust };
};

/**
 * Hero treatment.
 *
 * `typographic` is the launch-week v0: a bold type block, no imagery. The
 * draggable before/after slider is the signature element (SPEC §2) and the
 * single most persuasive thing this trade has, but it is worth nothing with a
 * stock photo in it. Flip to `slider` and fill `heroPair` the week we have a
 * real before/after of our own.
 */
/**
 * Fills every photo slot with a stamped placeholder so the layout can be
 * judged before real work exists. Generate them with `npm run placeholders`.
 *
 * LAUNCH BLOCKER: set this to false before the site goes live. The
 * placeholders are loud on purpose - each one says NOT A REAL JOB across the
 * bottom - but the rule they stand in for is absolute: only real photos of
 * our own work ever ship (CLAUDE.md, SPEC §2).
 */
export const USE_PLACEHOLDER_MEDIA = false;

/**
 * Real jobs, real photos. Sources live in photos-src/ (not committed - they
 * are 2-5MB each); `npm run photos` downscales them, re-encodes to WebP and
 * crops each pair to its common frame so the wipe never makes the house jump.
 *
 * TODO: add the suburb for each of these. The caption names it when set, and
 * "Pelican Waters" under a photo is worth more than any claim we can write.
 */
const REAL_PAIRS: readonly BeforeAfterPair[] = [
  {
    before: "/photos/driveway-before.webp",
    after: "/photos/driveway-after.webp",
    alt: "Exposed aggregate driveway, before and after a surface clean",
  },
  {
    before: "/photos/weatherboard-before.webp",
    after: "/photos/weatherboard-after.webp",
    alt: "Weatherboard wall, before and after a soft wash",
  },
  {
    before: "/photos/render-before.webp",
    after: "/photos/render-after.webp",
    alt: "Rendered wall and timber fence, before and after a soft wash",
  },
];

const PLACEHOLDER_PAIRS: readonly BeforeAfterPair[] = [
  {
    before: "/placeholder/driveway-before.png",
    after: "/placeholder/driveway-after.png",
    alt: "Placeholder for a driveway before and after",
    suburb: "Placeholder",
    placeholder: true,
  },
  {
    before: "/placeholder/house-before.png",
    after: "/placeholder/house-after.png",
    alt: "Placeholder for a house wall before and after",
    suburb: "Placeholder",
    placeholder: true,
  },
];

const PAIRS = USE_PLACEHOLDER_MEDIA ? PLACEHOLDER_PAIRS : REAL_PAIRS;

/** The driveway pair leads - it is the most persuasive of the three. */
export const HERO_MODE: "typographic" | "slider" =
  PAIRS.length > 0 ? "slider" : "typographic";

export const heroPair: BeforeAfterPair | null = PAIRS[0] ?? null;

/** Proof strip (SPEC §4.6). Section hides itself while both are empty. */
export const proofPairs: readonly BeforeAfterPair[] = PAIRS.slice(1);

export type Review = {
  quote: string;
  author: string;
  suburb: string;
  /** Out of 5. Only ever a real rating from a real Google review. */
  rating: number;
};

export const reviews: readonly Review[] = [];

/**
 * Storm season drives gutter enquiries (CLAUDE.md). September to November
 * inclusive, so the waitlist prompt sharpens up for those three months.
 */
export const STORM_SEASON_MONTHS = [9, 10, 11] as const;

export function isStormSeason(month: number): boolean {
  return (STORM_SEASON_MONTHS as readonly number[]).includes(month);
}
