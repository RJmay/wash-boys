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
export const HERO_MODE: "typographic" | "slider" = "typographic";

export const heroPair: BeforeAfterPair | null = null;

/** Proof strip (SPEC §4.6). Section hides itself while both are empty. */
export const proofPairs: readonly BeforeAfterPair[] = [];

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
