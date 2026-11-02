/**
 * Every visible `[PLACEHOLDER]` on the site, in one place.
 *
 * These are things the site must not claim until they are true
 * (docs/brief/business-brief.md): insurance, reviews, warranty wording, bank
 * details. Each renders on the page exactly as written here, in a dashed
 * outline, so nobody mistakes it for finished copy.
 *
 * To fill one, replace the string with the real wording. Anything that no
 * longer starts with "[" renders as normal text.
 */
export const PLACEHOLDERS = {
  /** Trust strip, FAQ "Are you insured?". Fill once public liability is active. */
  insurance: "[PLACEHOLDER: insurance line once cover is in place]",
  insuranceFaq: "[PLACEHOLDER: answer once cover is in place]",
  /** Trust strip. Fill with real reviews only. */
  reviews: "[PLACEHOLDER: reviews once we have them]",
  /** Gutter guard page and FAQ. From the mesh supplier. */
  gutterGuardWarranty: "[PLACEHOLDER: product warranty wording from supplier]",
  gutterGuardFaq: "[PLACEHOLDER: supplier warranty]",
  /** Deposit step and confirmation email. */
  bankAccountName: "[ACCOUNT NAME]",
  bankBsb: "[BSB]",
  bankAccountNumber: "[ACCOUNT NUMBER]",
  /** Photo slots for services with no real before-and-after yet. */
  gutterPhoto: "[PLACEHOLDER: gutter clean before-and-after photo]",
  windowsPhoto: "[PLACEHOLDER: exterior windows before-and-after photo]",
  gutterGuardPhoto: "[PLACEHOLDER: gutter guard before-and-after photo]",
} as const;

export function isFilled(value: string): boolean {
  return !value.startsWith("[");
}
