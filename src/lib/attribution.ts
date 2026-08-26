/**
 * Flyer attribution (SPEC §7).
 *
 * A scan lands on `/go/PW1`, which stamps a first-party cookie before
 * redirecting. Without it we would only ever attribute the landing view: most
 * people scan, read, wander off, and come back later to book. The cookie is
 * what lets a booking three days after the scan still count towards the batch
 * that paid for it.
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
