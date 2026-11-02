"use server";

import { BUSINESS } from "@/data/business";
import { quote, type PriceLine } from "@/data/pricing";
import { getSuburb } from "@/data/suburbs";
import { logEvent } from "./events";
import { sendBookingEmails } from "@/lib/email";
import { CAPACITY_PER_DAY } from "@/lib/street-days";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { BookingStatus, Json } from "@/lib/supabase/types";
import { bookingSchema, fieldErrors, leadSchema } from "@/lib/validation";

/**
 * Book page submission (docs/brief/site-content.md, "Book").
 *
 * Flow: validate -> check the day still has room -> save the booking with a
 * transfer reference -> upload photos -> email both sides -> hand back what
 * the deposit step needs.
 *
 * The price and deposit are recomputed here from pricing.json. Whatever the
 * browser showed is a display value; the number held against the booking has
 * to come from the price file.
 *
 * Suburb "Other" never becomes a booking: it is saved as a lead and the owner
 * calls back.
 */

export type BookingSuccess = {
  reference: string;
  date: string;
  summary: string;
  total: number;
  isFrom: boolean;
  lines: PriceLine[];
  deposit: number;
  confirmByPhone: string[];
  email: string;
  emailed: boolean;
  photosSaved: number;
  photosSent: number;
};

export type BookingState =
  | { status: "idle" }
  | { status: "error"; errors: Record<string, string> }
  | { status: "success"; booking: BookingSuccess }
  | { status: "enquiry"; suburb: string };

/** Statuses that take up a day. Cancelled and no-shows free it again. */
const LIVE_STATUSES: BookingStatus[] = ["new", "confirmed", "done"];

const MAX_PHOTOS = 4;
const MAX_PHOTO_BYTES = 6 * 1024 * 1024;

/** No 0/O or 1/I - it gets read out over the phone and typed into a bank app. */
const REF_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function newReference(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const body = [...bytes].map((b) => REF_ALPHABET[b % REF_ALPHABET.length]).join("");
  return `WB-${body}`;
}

function text(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

const GENERIC_FAILURE = `We could not save that just now. Call us on ${BUSINESS.phone.display} and we will book you in.`;

/** True while the day has room. Fails open: a lookup error never blocks a booking. */
async function dayHasRoom(date: string): Promise<boolean> {
  try {
    const { count, error } = await createAdminSupabase()
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("preferred_date", date)
      .in("status", LIVE_STATUSES);
    if (error) return true;
    return (count ?? 0) < CAPACITY_PER_DAY;
  } catch {
    return true;
  }
}

function photoFiles(formData: FormData): File[] {
  return formData
    .getAll("photos")
    .filter((f): f is File => typeof f === "object" && f !== null && "size" in f && f.size > 0);
}

/** Saves photos to the private job-photos bucket. Best effort - never fails the booking. */
async function uploadPhotos(reference: string, files: File[]): Promise<string[]> {
  const paths: string[] = [];
  const supabase = createAdminSupabase();
  for (const [i, file] of files.entries()) {
    if (!file.type.startsWith("image/") || file.size > MAX_PHOTO_BYTES) continue;
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `bookings/${reference}/${i + 1}.${ext}`;
    try {
      const { error } = await supabase.storage
        .from("job-photos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (!error) paths.push(path);
    } catch {
      /* best effort */
    }
  }
  return paths;
}

/** Suburb "Other": a lead to call back, never a booking. */
async function saveEnquiry(formData: FormData): Promise<BookingState> {
  const suburb = text(formData, "other_suburb") ?? "";
  const parsed = leadSchema.safeParse({
    kind: "out_of_area",
    name: text(formData, "name"),
    phone: text(formData, "phone") ?? "",
    suburb,
    message: [
      `Email: ${text(formData, "email") ?? "-"}`,
      `Address: ${text(formData, "address") ?? "-"}`,
      `Wants: ${text(formData, "package") ?? "-"} ${[...formData.getAll("services"), ...formData.getAll("addons")].join(", ")}`.trim(),
      `Storeys: ${text(formData, "storeys") ?? "-"}`,
      `Preferred day: ${text(formData, "preferred_date") ?? "-"}`,
      text(formData, "notes") ? `Notes: ${text(formData, "notes")}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    source_code: text(formData, "source"),
  });

  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    if (errors.suburb) errors.other_suburb = errors.suburb;
    return { status: "error", errors };
  }

  try {
    const { error } = await createAdminSupabase().from("leads").insert({
      kind: parsed.data.kind,
      name: parsed.data.name ?? null,
      phone: parsed.data.phone,
      suburb: parsed.data.suburb,
      message: parsed.data.message ?? null,
      source_code: parsed.data.source_code ?? null,
    });
    if (error) throw error;
  } catch {
    return { status: "error", errors: { form: GENERIC_FAILURE } };
  }

  await logEvent({
    type: "lead_out_of_area",
    code: parsed.data.source_code,
    meta: { suburb: parsed.data.suburb },
  });

  return { status: "enquiry", suburb: parsed.data.suburb };
}

export async function createBooking(
  _prev: BookingState,
  formData: FormData,
): Promise<BookingState> {
  if (formData.get("suburb") === "other") return saveEnquiry(formData);

  const parsed = bookingSchema.safeParse({
    name: text(formData, "name") ?? "",
    phone: text(formData, "phone") ?? "",
    email: text(formData, "email") ?? "",
    address: text(formData, "address") ?? "",
    suburb: text(formData, "suburb") ?? "",
    storeys: text(formData, "storeys"),
    package: text(formData, "package"),
    gutter_guard_size: text(formData, "gutter_guard_size"),
    services: formData.getAll("services").filter((v) => typeof v === "string"),
    addons: formData.getAll("addons").filter((v) => typeof v === "string"),
    roof_type: text(formData, "roof_type"),
    preferred_date: text(formData, "preferred_date") ?? "",
    notes: text(formData, "notes"),
    source: text(formData, "source"),
    page: text(formData, "page"),
  });

  if (!parsed.success) {
    return { status: "error", errors: fieldErrors(parsed.error) };
  }
  const input = parsed.data;

  const files = photoFiles(formData);
  if (files.length > MAX_PHOTOS) {
    return { status: "error", errors: { photos: `Up to ${MAX_PHOTOS} photos, please.` } };
  }

  // Recompute rather than trust the browser.
  const priced = quote({
    package: input.package,
    gutterGuardSize: input.package === "gutter-guard" ? input.gutter_guard_size : undefined,
    services: input.package === "single" ? input.services : undefined,
    addOns: input.package === "single" ? undefined : input.addons,
    storeys: input.storeys,
  });
  const hasGutterGuard = priced.items.some((id) => id.startsWith("gutter-guard"));

  if (!(await dayHasRoom(input.preferred_date))) {
    return {
      status: "error",
      errors: { preferred_date: "That day just filled up. Please pick another." },
    };
  }

  let reference = "";
  try {
    const supabase = createAdminSupabase();

    // A reference collision is vanishingly rare, but retry rather than fail.
    for (let attempt = 0; attempt < 3; attempt++) {
      reference = newReference();
      const { error } = await supabase.from("bookings").insert({
        name: input.name,
        phone: input.phone,
        email: input.email,
        address: input.address,
        suburb: input.suburb,
        service_slugs: priced.items,
        preferred_date: input.preferred_date,
        slot: "am",
        notes: input.notes ?? null,
        // The FK column only takes registered codes; the trigger nulls the
        // rest. `source` keeps the raw value either way.
        source_code: input.source ?? null,
        source: input.source ?? null,
        page: input.page ?? null,
        storeys: input.storeys,
        package: input.package,
        gutter_guard_size: input.package === "gutter-guard" ? (input.gutter_guard_size ?? null) : null,
        roof_type: hasGutterGuard ? (input.roof_type ?? null) : null,
        quoted_price: priced.total,
        price_lines: priced.lines as unknown as Json,
        est_low: priced.total,
        est_high: priced.total,
        deposit_amount: priced.deposit,
        deposit_status: "pending",
        reference,
      });
      if (!error) break;
      // 23505 = unique violation on the reference; anything else is real.
      if (error.code !== "23505" || attempt === 2) throw error;
    }
  } catch {
    return { status: "error", errors: { form: GENERIC_FAILURE } };
  }

  const photoPaths = files.length ? await uploadPhotos(reference, files) : [];
  if (photoPaths.length) {
    try {
      await createAdminSupabase()
        .from("bookings")
        .update({ photo_urls: photoPaths })
        .eq("reference", reference);
    } catch {
      /* the photos are in storage under the reference either way */
    }
  }

  const suburbName = getSuburb(input.suburb)?.name ?? input.suburb;

  const emailed = await sendBookingEmails({
    reference,
    name: input.name,
    phone: input.phone,
    email: input.email,
    address: input.address,
    suburbName,
    summary: priced.summary,
    lines: priced.lines,
    total: priced.total,
    isFrom: priced.isFrom,
    deposit: priced.deposit,
    confirmByPhone: priced.confirmByPhone,
    storeys: input.storeys,
    roofType: hasGutterGuard ? input.roof_type : undefined,
    date: input.preferred_date,
    notes: input.notes,
    source: input.source,
    page: input.page,
    photoCount: photoPaths.length,
  });

  await logEvent({
    type: "book_done",
    code: input.source,
    meta: {
      suburb: input.suburb,
      package: input.package,
      items: priced.items,
      total: priced.total,
      deposit: priced.deposit,
      page: input.page ?? null,
    },
  });

  return {
    status: "success",
    booking: {
      reference,
      date: input.preferred_date,
      summary: priced.summary,
      total: priced.total,
      isFrom: priced.isFrom,
      lines: priced.lines,
      deposit: priced.deposit,
      confirmByPhone: priced.confirmByPhone,
      email: input.email,
      emailed: emailed.customer,
      photosSaved: photoPaths.length,
      photosSent: files.length,
    },
  };
}

