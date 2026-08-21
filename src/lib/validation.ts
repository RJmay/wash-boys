import { z } from "zod";

import {
  getBand,
  getService,
  isBanded,
  SERVICES,
  type ServiceSlug,
} from "@/data/services";
import { isServicedSuburb } from "@/data/suburbs";
import { BOOKING_WINDOW_DAYS, daysBetween, isISODate, todayISO } from "./dates";

/**
 * Every public input crosses one of these before it reaches the database
 * (CLAUDE.md: zod on every input). Schemas are shared by the server actions
 * and the client-side field hints so the two cannot drift.
 */

// ── Primitives ────────────────────────────────────────────────────────────

const AU_MOBILE = /^(?:\+?61|0)4\d{8}$/;

/**
 * Australian mobile, normalised to E.164 (+614XXXXXXXX) on the way in so the
 * admin tap-to-call link and any future SMS both work off one format.
 * Mobile only - we confirm every booking by text.
 */
export const auMobile = z
  .string()
  .trim()
  .min(1, "Mobile number is required")
  .transform((value) => value.replace(/[\s()\-.]/g, ""))
  .refine((value) => AU_MOBILE.test(value), {
    message: "Enter an Australian mobile, like 0412 345 678",
  })
  .transform((value) => {
    const digits = value.replace(/^\+?61/, "").replace(/^0/, "");
    return `+61${digits}`;
  });

/** Optional email: empty string and whitespace both mean "not given". */
export const optionalEmail = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .pipe(z.email({ message: "That email does not look right" }).optional());

const personName = z
  .string()
  .trim()
  .min(2, "Please enter your name")
  .max(80, "That name is too long");

/** QR batch code from the ?c= param or the attribution cookie, e.g. "PW1". */
export const sourceCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{1,16}$/, "Invalid code")
  .optional();

const suburbSlug = z
  .string()
  .trim()
  .refine(isServicedSuburb, { message: "We do not cover that suburb yet" });

const photoUrls = z
  .array(z.url())
  .max(6, "Six photos is plenty")
  .optional();

const utm = z.record(z.string(), z.string()).optional();

/** Booking date: a real date, inside the window, never in the past. */
const preferredDate = z
  .string()
  .refine(isISODate, { message: "Pick a date" })
  .refine((iso) => daysBetween(todayISO(), iso) >= 0, {
    message: "That date has already passed",
  })
  .refine((iso) => daysBetween(todayISO(), iso) <= BOOKING_WINDOW_DAYS, {
    message: `We only take bookings ${BOOKING_WINDOW_DAYS} days ahead - call us for anything further out`,
  });

export const slotSchema = z.enum(["am", "pm"]);

const BOOKABLE_SLUGS = SERVICES.filter((s) => s.active && s.bookable).map(
  (s) => s.slug,
) as [ServiceSlug, ...ServiceSlug[]];

/**
 * Only bookable services get through. Gutter cleaning is excluded at the type
 * level, so no hand-crafted request can book a service we do not offer.
 */
const serviceSlugs = z
  .array(z.enum(BOOKABLE_SLUGS))
  .min(1, "Pick at least one service")
  .max(BOOKABLE_SLUGS.length)
  .refine((slugs) => new Set(slugs).size === slugs.length, {
    message: "Duplicate service",
  });

// ── Public submissions ────────────────────────────────────────────────────

/**
 * Size band per service, keyed by slug: `{ "patio-cleaning": { band: "medium" } }`.
 * Patios are priced on area and fences on length, so the band is what turns a
 * provisional range into a real one.
 */
export const serviceOptionsSchema = z
  .record(z.string(), z.object({ band: z.string().trim().min(1) }))
  .optional();

/** POST from the booking flow (SPEC §5). */
export const bookingSchema = z
  .object({
    name: personName,
    phone: auMobile,
    email: optionalEmail,
    address: z
      .string()
      .trim()
      .min(5, "Please enter the street address")
      .max(200, "That address is too long"),
    suburb: suburbSlug,
    service_slugs: serviceSlugs,
    service_options: serviceOptionsSchema,
    preferred_date: preferredDate,
    slot: slotSchema,
    notes: z
      .string()
      .trim()
      .max(500, "Please keep notes under 500 characters")
      .optional(),
    photo_urls: photoUrls,
    source_code: sourceCode,
    utm,
  })
  /**
   * Services priced on size must arrive with a valid band, or the estimate
   * saved against the booking would be a guess the customer never agreed to.
   */
  .superRefine((value, ctx) => {
    for (const slug of value.service_slugs) {
      const service = getService(slug);
      if (!service || !isBanded(service)) continue;

      const chosen = value.service_options?.[slug]?.band;
      if (!chosen) {
        ctx.addIssue({
          code: "custom",
          path: ["service_options", slug],
          message: `Pick a size for ${service.shortName.toLowerCase()}`,
        });
        continue;
      }
      if (!getBand(service, chosen)) {
        ctx.addIssue({
          code: "custom",
          path: ["service_options", slug],
          message: "That size is not one of the options",
        });
      }
    }
  });

export type BookingInput = z.infer<typeof bookingSchema>;

/** Photo quote request for non-standard jobs (SPEC §3, /quote). */
export const quoteRequestSchema = z.object({
  name: personName.optional(),
  phone: auMobile,
  /** Free text: quote requests are welcome from outside the service area. */
  suburb: z.string().trim().max(80).optional(),
  description: z
    .string()
    .trim()
    .min(10, "Tell us a little about the job")
    .max(1000, "Please keep it under 1000 characters"),
  photo_urls: photoUrls,
  source_code: sourceCode,
});

export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;

/**
 * Gutter waitlist (CLAUDE.md). Never a booking, never priced - this is the
 * only thing a gutter enquiry is allowed to become until the service is live.
 */
export const waitlistSchema = z.object({
  service_slug: z.literal("gutter-cleaning").default("gutter-cleaning"),
  name: personName,
  phone: auMobile,
  /** Free text: storm-season demand from just outside the corridor still counts. */
  suburb: z.string().trim().max(80).optional(),
  source_code: sourceCode,
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;

/** Where a lead came from. Drives how the admin leads screen groups them. */
export const LEAD_KINDS = ["out_of_area", "general"] as const;
export type LeadKind = (typeof LEAD_KINDS)[number];

/**
 * Out-of-area catch from booking step 2, and any other "call me" capture that
 * is not a booking. Lands in the `leads` table - a real contact record with a
 * status the owner can work through, rather than PII buried in the append-only
 * events log. A `lead_out_of_area` event is still logged alongside it so the
 * funnel maths stays intact.
 */
export const leadSchema = z.object({
  kind: z.enum(LEAD_KINDS).default("out_of_area"),
  name: personName.optional(),
  phone: auMobile,
  /** Free text on purpose - the whole point is that it is off our list. */
  suburb: z.string().trim().min(2, "Which suburb?").max(80),
  message: z.string().trim().max(500).optional(),
  source_code: sourceCode,
});

export type LeadInput = z.infer<typeof leadSchema>;

/** Lead lifecycle in admin. */
export const LEAD_STATUSES = ["new", "called", "converted", "dead"] as const;
export const leadStatusSchema = z.enum(LEAD_STATUSES);

// ── Funnel events ─────────────────────────────────────────────────────────

export const eventTypeSchema = z.enum([
  "scan",
  "land",
  "book_start",
  "book_done",
  "call_tap",
  "quote_req",
  "lead_out_of_area",
]);

export const eventSchema = z.object({
  type: eventTypeSchema,
  code: sourceCode,
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type EventInput = z.infer<typeof eventSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────

/** "+61412345678" -> "0412 345 678" for display and admin call links. */
export function formatAuMobile(e164: string): string {
  const digits = e164.replace(/^\+61/, "0");
  if (!/^04\d{8}$/.test(digits)) return e164;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

/** Flattens a zod error into `{ field: message }` for form rendering. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}
