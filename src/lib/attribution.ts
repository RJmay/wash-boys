/**
 * Flyer attribution.
 *
 * Each flyer's QR opens the site with `?src=STREETGROUP`, one code per flyer
 * street group. The code is stamped into a first-party cookie on arrival so a
 * booking made days later, from a bookmark, still credits the street group
 * that brought them. `?c=` is still read as a fallback for any older link.
 *
 * Codes are case-insensitive and stored uppercase, e.g. `?src=aroona-3` is
 * recorded as `AROONA-3`. Register them in the qr_codes table for funnel
 * joins; an unregistered code is still kept on the booking (`source`) and in
 * the event's meta, never dropped.
 */

export const ATTRIBUTION_COOKIE = "wb_c";

/** Long enough to cover a second flyer pass and a slow decision. */
export const ATTRIBUTION_MAX_AGE = 60 * 60 * 24 * 90;

/** Street-group codes: letters, digits, dash and underscore. */
const CODE = /^[A-Z0-9_-]{1,32}$/;

export function normaliseCode(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  return CODE.test(code) ? code : null;
}

/** URL parameters that carry a code, in priority order. */
export const SOURCE_PARAMS = ["src", "c"] as const;
