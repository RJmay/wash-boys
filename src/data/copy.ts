import {
  DEPOSITS,
  formatPrice,
  getPricedService,
  GUTTER_GUARD_FROM,
  HEADLINE_BUNDLE,
} from "./pricing";

/**
 * Page copy that more than one page shares, from docs/brief/site-content.md.
 * Every number is interpolated from pricing.json, never typed in.
 */

const driveway = getPricedService("driveway");

export const HEADLINE_PRICE = formatPrice(HEADLINE_BUNDLE.price);

/** "What's in the Exterior Refresh". */
export const REFRESH_INCLUDES = [
  "House soft wash: walls, eaves and frames",
  `Driveway and paths pressure cleaned, up to ${driveway?.includedArea_m2 ?? 0} m²`,
  "Gutters cleaned, debris bagged and taken away",
  "Exterior windows cleaned, frames and screens rinsed",
] as const;

/** Short version, on the home page and suburb pages. */
export const HOW_IT_WORKS_SHORT: readonly { title: string; body: string }[] = [
  { title: "Pick your day.", body: "We book whole streets on set days." },
  { title: `Pay a ${formatPrice(DEPOSITS.cleaning)} deposit`, body: "to hold it." },
  {
    title: "Two of us arrive in the morning.",
    body: "One on the gutters and windows, one on the wash and driveway.",
  },
  {
    title: "Done in four to five hours.",
    body: "You get before-and-after photos and pay the balance.",
  },
];

/** Full version, on /how-it-works. */
export const HOW_IT_WORKS_FULL: readonly { title: string; body: string }[] = [
  {
    title: "Book a day.",
    body: `Choose your service and a day we're in your suburb. Pay a ${formatPrice(DEPOSITS.cleaning)} deposit (${formatPrice(DEPOSITS.gutterGuard)} for gutter guard).`,
  },
  { title: "We confirm.", body: "We call if we need to check size, storeys or access." },
  {
    title: "On the day.",
    body: "Two of us arrive in the morning. Leave a gate open and a tap we can use; you don't need to be home.",
  },
  {
    title: "Done.",
    body: "Before-and-after photos by text, balance invoiced, and an offer to book next year's Refresh.",
  },
];

/**
 * "Why book us", from the positioning in docs/brief/business-brief.md. Only
 * what is true today: insurance and reviews are added once the owner has them.
 */
export const WHY_US: readonly { title: string; body: string }[] = [
  {
    title: "One morning, one fixed price.",
    body: "The whole exterior done in one go. No quote visit, no call-out fee.",
  },
  {
    title: "Why it's cheaper.",
    body: "We already deliver to your street, and we book whole streets on the same days, so there's no travel cost to pass on.",
  },
  {
    title: "Local and accountable.",
    body: "Two locals, the same two people on every job.",
  },
  {
    title: "Careful with your home.",
    body: "Soft wash on painted surfaces, not high pressure. Wash water kept out of the street drains.",
  },
];

export const GUTTER_GUARD_TEASER =`Tired of cleaning gutters? Aluminium gutter guard, fitted, from ${formatPrice(GUTTER_GUARD_FROM)}, gutter clean included. Fixed price by gutter length, no sales visit.`;

export const PRICE_TABLE_NOTE =
  "All prices include GST and are for single-storey homes. Not sure of your size? Book anyway and we'll confirm by phone before the day.";
