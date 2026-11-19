/**
 * Single source of truth for business facts used in copy, schema.org markup
 * and transactional email.
 *
 * Phone, ABN, email, domain and the deposit bank account all live here and
 * nowhere else. They are real; the flyer preflight checks them before it will
 * write print artwork. What is still to fill is in src/data/placeholders.ts.
 */

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
   * description so the owner can match it on the statement. The account
   * name must match the bank's records exactly, or the customer's banking
   * app warns them the name doesn't match (Confirmation of Payee).
   */
  bank: {
    accountName: "Ryan May",
    bsb: "814-282",
    accountNumber: "51826963",
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
