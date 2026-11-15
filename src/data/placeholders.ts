/**
 * Every `[PLACEHOLDER]` on the site, in one place.
 *
 * These are things the site must not claim until they are true
 * (docs/brief/business-brief.md): insurance, reviews, warranty wording, bank
 * details. In development each renders exactly as written here, in a dashed
 * outline, so nobody mistakes it for finished copy. In a production build an
 * unfilled one is left off the page entirely: a buyer reading
 * "[PLACEHOLDER: insurance line…]" reads "not insured".
 *
 * To fill one, replace the string with the real wording. Anything that no
 * longer starts with "[" renders as normal text, in every build.
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
  /** FAQ "Can I change or cancel my booking?". The owner's deposit policy. */
  cancellationFaq: "[PLACEHOLDER: change, cancellation and deposit refund policy]",
  /** FAQ "What if I'm not happy with something?". The owner's call. */
  notHappyFaq: "[PLACEHOLDER: what happens if a customer isn't happy]",
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

/**
 * Unfilled placeholders show while developing and vanish from production
 * builds. `next dev` is where the owner sees what is still to fill.
 */
export const SHOW_PLACEHOLDERS = process.env.NODE_ENV !== "production";

/** True when this value should be on the page: filled, or we are developing. */
export function isShown(value: string): boolean {
  return isFilled(value) || SHOW_PLACEHOLDERS;
}
