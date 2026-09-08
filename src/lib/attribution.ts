/**
 * Campaign attribution (SPEC §7).
 *
 * A visitor arriving on `?c=SOMETHING` gets that stamped into a first-party
 * cookie. Without it we would only ever attribute the landing view: people
 * read, wander off, and come back later to book, and a booking three days
 * later otherwise looks like organic traffic.
 *
 * The flyer QR points straight at the site with no code on it, so nothing sets
 * this today. It stays because it costs nothing and it is what any future
 * campaign link would use.
 */

export const ATTRIBUTION_COOKIE = "wb_c";

/** Long enough to cover a second flyer pass and a slow decision. */
export const ATTRIBUTION_MAX_AGE = 60 * 60 * 24 * 90;

/** Printed codes are short and uppercase; anything else is not one of ours. */
const CODE = /^[A-Z0-9]{1,16}$/;

export function normaliseCode(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  return CODE.test(code) ? code : null;
}

/**
 * What we record when a printed code is not in the database - a misread scan,
 * a typo, or a batch that was never registered. Never a 404: someone is
 * standing at a letterbox holding the flyer.
 */
export const UNKNOWN_CODE = "UNKNOWN";
