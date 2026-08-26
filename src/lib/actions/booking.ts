"use server";

import { BUSINESS } from "@/data/business";
import { getSuburb } from "@/data/suburbs";
import { slotStillFree } from "./availability";
import { logEvent } from "./events";
import { sendBookingEmails } from "@/lib/email";
import { estimateRange, type ServiceSelection } from "@/lib/pricing";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { bookingSchema, fieldErrors } from "@/lib/validation";
import type { Json } from "@/lib/supabase/types";

/**
 * Booking submission (SPEC §5).
 *
 * The estimate is recomputed here from the selected services and size bands.
 * Whatever the browser sent is a display value; the number stored against the
 * booking has to come from the rate card, or the quote a customer was shown
 * and the quote we hold could differ.
 */

export type BookingSuccess = {
  id: string;
  date: string;
  slot: "am" | "pm";
  estLow: number;
  estHigh: number;
  bundleDiscount: boolean;
  emailed: boolean;
};

export type BookingState =
  | { status: "idle" }
  | { status: "error"; errors: Record<string, string> }
  | { status: "success"; booking: BookingSuccess };

/**
 * An unrecognised code must never cost a booking. Resolve it against qr_codes
 * and fall back to null, keeping the raw value in `utm` so attribution can
 * still be investigated. The database has a trigger doing the same thing; this
 * is the deliberate path rather than the safety net.
 */
async function resolveSourceCode(
  supabase: ReturnType<typeof createAdminSupabase>,
  code: string | undefined,
): Promise<{ sourceCode: string | null; utm: Json | null }> {
  if (!code) return { sourceCode: null, utm: null };
  try {
    const { data } = await supabase
      .from("qr_codes")
      .select("code")
      .eq("code", code)
      .maybeSingle();
    if (data?.code) return { sourceCode: data.code, utm: null };
  } catch {
    /* fall through - an unknown code is not worth failing on */
  }
  return { sourceCode: null, utm: { unknown_code: code } as Json };
}

export async function createBooking(
  _prev: BookingState,
  formData: FormData,
): Promise<BookingState> {
  const raw = formData.get("payload");
  if (typeof raw !== "string") {
    return { status: "error", errors: { form: "Something went wrong. Please try again." } };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return { status: "error", errors: { form: "Something went wrong. Please try again." } };
  }

  const parsed = bookingSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return { status: "error", errors: fieldErrors(parsed.error) };
  }

  const input = parsed.data;

  // Recompute rather than trust the client.
  const selections: ServiceSelection[] = input.service_slugs.map((slug) => ({
    slug,
    bandId: input.service_options?.[slug]?.band,
  }));
  const estimate = estimateRange(selections);

  // The picker may have been open for minutes. Two people can reach step 4
  // for the last Saturday morning at the same time.
  if (!(await slotStillFree(input.preferred_date, input.slot))) {
    return {
      status: "error",
      errors: {
        slot: "That slot just filled up. Please pick another time.",
      },
    };
  }

  let bookingId: string;
  try {
    const supabase = createAdminSupabase();
    const { sourceCode, utm } = await resolveSourceCode(
      supabase,
      input.source_code,
    );

    const { data, error } = await supabase
      .from("bookings")
      .insert({
        name: input.name,
        phone: input.phone,
        email: input.email ?? null,
        address: input.address,
        suburb: input.suburb,
        service_slugs: [...input.service_slugs],
        service_options: (input.service_options ?? null) as Json,
        bundle_discount: estimate.bundleApplied,
        est_low: estimate.low,
        est_high: estimate.high,
        preferred_date: input.preferred_date,
        slot: input.slot,
        notes: input.notes ?? null,
        photo_urls: input.photo_urls ? [...input.photo_urls] : null,
        source_code: sourceCode,
        utm,
      })
      .select("id")
      .single();

    if (error || !data) throw error ?? new Error("no row returned");
    bookingId = data.id;
  } catch {
    return {
      status: "error",
      errors: {
        // Hand over the phone number rather than making them hunt for it.
        // A booking that fails silently is a lost job.
        form: `We could not save that just now. Call us on ${BUSINESS.phone.display} and we will book you in.`,
      },
    };
  }

  const suburbName = getSuburb(input.suburb)?.name ?? input.suburb;

  const emailed = await sendBookingEmails({
    id: bookingId,
    name: input.name,
    phone: input.phone,
    email: input.email,
    address: input.address,
    suburbName,
    serviceSlugs: [...input.service_slugs],
    serviceOptions: input.service_options,
    date: input.preferred_date,
    slot: input.slot,
    estLow: estimate.low,
    estHigh: estimate.high,
    bundleDiscount: estimate.bundleApplied,
    notes: input.notes,
  });

  await logEvent({
    type: "book_done",
    code: input.source_code,
    meta: {
      suburb: input.suburb,
      services: input.service_slugs,
      est_low: estimate.low,
      est_high: estimate.high,
      bundle: estimate.bundleApplied,
    },
  });

  return {
    status: "success",
    booking: {
      id: bookingId,
      date: input.preferred_date,
      slot: input.slot,
      estLow: estimate.low,
      estHigh: estimate.high,
      bundleDiscount: estimate.bundleApplied,
      emailed: emailed.owner,
    },
  };
}
