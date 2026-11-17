/**
 * Single source of truth for business facts used in copy, schema.org markup
 * and transactional email.
 *
 * Phone, ABN, email and domain all live here and nowhere else. They are real;
 * the flyer preflight checks them before it will write print artwork. Bank
 * details for the deposit are still placeholders - see src/data/placeholders.ts
 * for the full list of what is still to fill.
 */

import { PLACEHOLDERS } from "./placeholders";

export const BUSINESS = {
  name: "Wash Boys",
  tagline: "House wash, driveway, gutters and windows. Sunshine Coast.",

  phone: {
    /** Human-readable, as shown on the page and the flyer. */
    display: "0478 474 313",
    /** E.164 for `tel:` links. */
    tel: "+61478474313",
  },

  /** Shown in the footer and on the flyer trust bar. Checksum-validated. */
  abn: "13 746 164 491",

  domain: "washboys.com.au",
  email: "bookings@washboys.com.au",

  base: {
    suburb: "Aroona",
    city: "Caloundra",
    region: "Sunshine Coast",
    state: "QLD",
    country: "AU",
  },

  /**
   * Deposit by bank transfer. The booking reference goes in the transfer
   * description so the owner can match it on the statement.
   */
  bank: {
    accountName: PLACEHOLDERS.bankAccountName,
    bsb: PLACEHOLDERS.bankBsb,
    accountNumber: PLACEHOLDERS.bankAccountNumber,
  },

  /** Said on every page that shows a price. */
  gstNote: "Prices include GST.",
} as const;

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
