import { z } from "zod";

import {
  ADD_ON_IDS,
  GUTTER_GUARD_SIZES,
  includesGutterGuard,
  PACKAGE_CHOICES,
  SERVICE_IDS,
} from "@/data/pricing";
import { isServicedSuburb } from "@/data/suburbs";
import { daysBetween, isISODate, todayISO } from "./dates";
import { OPEN_PICKER_DAYS, upcomingDays } from "./street-days";

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

/** Required email - the deposit details and confirmation go to it. */
export const requiredEmail = z
  .string()
  .trim()
  .min(1, "Email is required")
  .pipe(z.email({ message: "That email does not look right" }));

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

/**
 * Flyer street-group code from `?src=` or the attribution cookie, e.g.
 * "AROONA-3". An unparseable code is dropped rather than failing the form -
 * attribution must never cost a booking.
 */
export const sourceCode = z
  .string()
  .trim()
  .toUpperCase()
  .optional()
  .transform((value) =>
    value && /^[A-Z0-9_-]{1,32}$/.test(value) ? value : undefined,
  );

const suburbSlug = z
  .string()
  .trim()
  .refine(isServicedSuburb, { message: "We do not cover that suburb yet" });

const photoUrls = z
  .array(z.url())
  .max(6, "Six photos is plenty")
  .optional();

/** Booking date: a real date, from tomorrow, inside the open-picker window. */
const preferredDate = z
  .string()
  .refine(isISODate, { message: "Pick a day" })
  .refine((iso) => daysBetween(todayISO(), iso) >= 1, {
    message: "Pick a day from tomorrow onwards",
  })
  .refine((iso) => daysBetween(todayISO(), iso) <= OPEN_PICKER_DAYS, {
    message: `We only take bookings ${OPEN_PICKER_DAYS} days ahead - call us for anything further out`,
  });

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => (value ? value : undefined));

// ── Public submissions ────────────────────────────────────────────────────

/**
 * POST from the Book page (docs/brief/site-content.md).
 *
 * Price and deposit are not accepted from the browser at all: the server
 * recomputes both from pricing.json.
 */
export const bookingSchema = z
  .object({
    name: personName,
    phone: auMobile,
    email: requiredEmail,
    address: z
      .string()
      .trim()
      .min(5, "Please enter the street address")
      .max(200, "That address is too long"),
    suburb: suburbSlug,
    storeys: z.enum(["single", "double"], { message: "Single or double storey?" }),
    package: z.enum(PACKAGE_CHOICES, { message: "Pick what you would like done" }),
    gutter_guard_size: z.enum(GUTTER_GUARD_SIZES).optional(),
    services: z
      .array(z.enum(SERVICE_IDS))
      .max(SERVICE_IDS.length)
      .default([])
      .transform((ids) => [...new Set(ids)]),
    /** Add-ons (fences) on top of a bundle or gutter guard. */
    addons: z
      .array(z.string())
      .default([])
      .transform((ids) => [...new Set(ids)])
      .pipe(z.array(z.enum(SERVICE_IDS)))
      .refine((ids) => ids.every((id) => ADD_ON_IDS.includes(id)), {
        message: "That can't be added on",
      }),
    roof_type: z.enum(["tile", "metal", "not-sure"]).optional(),
    preferred_date: preferredDate,
    notes: optionalText(500, "Please keep notes under 500 characters"),
    source: sourceCode,
    page: optionalText(200, "Page too long"),
  })
  .superRefine((value, ctx) => {
    if (value.package === "gutter-guard" && !value.gutter_guard_size) {
      ctx.addIssue({
        code: "custom",
        path: ["gutter_guard_size"],
        message: "Pick a gutter guard size, or 'not sure'",
      });
    }
    if (value.package === "single" && value.services.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["services"],
        message: "Tick at least one service",
      });
    }
    if (includesGutterGuard(value) && !value.roof_type) {
      ctx.addIssue({
        code: "custom",
        path: ["roof_type"],
        message: "What is the roof made of? 'Not sure' is fine",
      });
    }
    // A suburb with listed street days only books on those days.
    const days = upcomingDays(value.suburb);
    if (days.length > 0 && !days.includes(value.preferred_date)) {
      ctx.addIssue({
        code: "custom",
        path: ["preferred_date"],
        message: "Pick one of the days we are in your suburb",
      });
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


/** Where a lead came from. Drives how the admin leads screen groups them. */
export const LEAD_KINDS = ["out_of_area", "general"] as const;
export type LeadKind = (typeof LEAD_KINDS)[number];

/**
 * "Other" suburb on the Book page, and any other "call me" capture that
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
  message: z.string().trim().max(1500).optional(),
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
