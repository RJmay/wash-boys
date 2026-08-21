/**
 * Single source of truth for business facts used in copy, schema.org markup
 * and transactional email.
 *
 * LAUNCH BLOCKER: the three bracketed placeholders below are the only place
 * [PHONE], [ABN] and [DOMAIN] appear in the codebase. Replace them here and
 * the whole site is updated. Nothing may be printed on a flyer until they are
 * real (SPEC §9 launch checklist).
 */

export const BUSINESS = {
  name: "Wash Boys",
  tagline: "Pressure washing, Caloundra to Buderim",

  /** TODO(launch): replace with the real number. Keep both forms in sync. */
  phone: {
    /** Human-readable, as shown on the page and the flyer. */
    display: "[PHONE]",
    /** E.164 for `tel:` links — e.g. "+61412345678". */
    tel: "[PHONE]",
  },

  /** TODO(launch): replace with the real ABN (footer + flyer trust bar). */
  abn: "[ABN]",

  /** TODO(launch): replace once the domain is bought (KICKOFF session 0). */
  domain: "[DOMAIN]",
  email: "bookings@[DOMAIN]",

  base: {
    suburb: "Aroona",
    city: "Caloundra",
    state: "QLD",
    country: "AU",
  },

  /**
   * Trust claims. Every one of these must be true before flyers drop —
   * public liability cover active, ABN registered (SPEC §9).
   */
  trust: {
    insured: "Fully insured (public liability)",
    local: "Local, owner-operated crew",
    guarantee: "Not happy? We come back and re-wash it free.",
  },

  /** Tue–Sat AM/PM half-days, plus optional Sunday PM overflow after 11am. */
  hours: {
    days: "Tuesday to Saturday",
    note: "Sunday afternoons by arrangement — petrol washers are loud, so we never start a Sunday before 11am.",
  },

  /** Applied automatically in the booking flow at 2+ services (SPEC §5). */
  bundleDiscountPct: 15,

  /** Said out loud on every page that shows a price (CLAUDE.md). */
  pricingDisclaimer:
    "Final price confirmed on site before we start. Pay on the day.",
} as const;

/** Bundle rule: 15% off once two or more bookable services are selected. */
export const BUNDLE_MIN_SERVICES = 2;

/** True while a value is still a `[PLACEHOLDER]` from the launch checklist. */
export function isPlaceholder(value: string): boolean {
  return value.startsWith("[") && value.endsWith("]");
}

/**
 * Guards against shipping a dead `tel:` link. While the number is unset the UI
 * renders the placeholder as plain text - visibly broken beats silently
 * broken, and it cannot survive a launch review.
 */
export const PHONE_CONFIGURED = !isPlaceholder(BUSINESS.phone.tel);
