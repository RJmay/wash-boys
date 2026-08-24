/**
 * Switches for content that depends on assets we do not have yet.
 *
 * The hard rule behind all of this (CLAUDE.md, SPEC §2): real photos of our
 * own work only. No stock before/afters, no borrowed reviews. Until the first
 * driveways are done in soft-launch week, the page shows an honest empty state
 * instead of a fake one.
 */

export type BeforeAfterPair = {
  /** Path under /public, or a Supabase Storage URL. */
  before: string;
  after: string;
  /** What the photo actually shows - used as alt text. */
  alt: string;
  /** Where the job was, e.g. "Pelican Waters". Proof it is local. */
  suburb: string;
  /** True for layout stand-ins, so the caption never claims it is our work. */
  placeholder?: boolean;
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
export const USE_PLACEHOLDER_MEDIA = true;

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
  {
    before: "/placeholder/patio-before.png",
    after: "/placeholder/patio-after.png",
    alt: "Placeholder for a patio before and after",
    suburb: "Placeholder",
    placeholder: true,
  },
];

export const HERO_MODE: "typographic" | "slider" = USE_PLACEHOLDER_MEDIA
  ? "slider"
  : "typographic";

export const heroPair: BeforeAfterPair | null = USE_PLACEHOLDER_MEDIA
  ? PLACEHOLDER_PAIRS[0]
  : null;

/** Proof strip (SPEC §4.6). Section hides itself while both are empty. */
export const proofPairs: readonly BeforeAfterPair[] = USE_PLACEHOLDER_MEDIA
  ? PLACEHOLDER_PAIRS.slice(1)
  : [];

export type Review = {
  quote: string;
  author: string;
  suburb: string;
  /** Out of 5. Only ever a real rating from a real Google review. */
  rating: number;
};

export const reviews: readonly Review[] = USE_PLACEHOLDER_MEDIA
  ? [
      {
        quote:
          "PLACEHOLDER — a real Google review goes here once the first jobs are done. Roughly this length reads well on a phone.",
        author: "Placeholder",
        suburb: "Not a real review",
        rating: 5,
      },
      {
        quote:
          "PLACEHOLDER — the second review card. Two or three of these is plenty; the strip hides itself when there are none.",
        author: "Placeholder",
        suburb: "Not a real review",
        rating: 5,
      },
    ]
  : [];

/**
 * Storm season drives gutter enquiries (CLAUDE.md). September to November
 * inclusive, so the waitlist prompt sharpens up for those three months.
 */
export const STORM_SEASON_MONTHS = [9, 10, 11] as const;

export function isStormSeason(month: number): boolean {
  return (STORM_SEASON_MONTHS as readonly number[]).includes(month);
}
