"use server";

import { logEvent } from "./events";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { BUSINESS } from "@/data/business";
import { sendLeadAlert } from "@/lib/email";
import { fieldErrors, leadSchema } from "@/lib/validation";

/**
 * "Call me back" (the TalkFirst section on the home, suburb and service
 * pages).
 *
 * For the visitor who is interested but not ready to pick a day and pay a
 * deposit to a business they met on a flyer five minutes ago. Two fields and
 * a suburb; the owner rings them. Saved as a `leads` row of kind `general`,
 * with a `callback_req` event so the funnel still counts it against the
 * flyer that brought them.
 *
 * Out-of-area enquiries from the Book page are saved by the booking action
 * itself (kind `out_of_area`), not here.
 */

export type LeadState =
  | { status: "idle" }
  | { status: "error"; errors: Record<string, string> }
  | { status: "success" };

function text(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

export async function requestCallback(
  _prev: LeadState,
  formData: FormData,
): Promise<LeadState> {
  const page = text(formData, "page")?.slice(0, 200);
  const parsed = leadSchema.safeParse({
    kind: "general",
    name: text(formData, "name"),
    phone: text(formData, "phone") ?? "",
    suburb: text(formData, "suburb") ?? "",
    message: `Asked for a call back${page ? ` from ${page}` : ""}`,
    source_code: text(formData, "source_code"),
  });

  if (!parsed.success) {
    return { status: "error", errors: fieldErrors(parsed.error) };
  }

  const { kind, name, phone, suburb, message, source_code } = parsed.data;

  try {
    const { error } = await createAdminSupabase()
      .from("leads")
      .insert({
        kind,
        name: name ?? null,
        phone,
        suburb,
        message: message ?? null,
        source_code: source_code ?? null,
      });
    if (error) throw error;
  } catch {
    return {
      status: "error",
      errors: {
        form: `We could not save that just now. Call or text us on ${BUSINESS.phone.display}.`,
      },
    };
  }

  await sendLeadAlert({
    kind: "callback",
    name,
    phone,
    suburb,
    message,
    source: source_code,
  });

  // The lead row is the contact record; the event keeps the funnel maths whole.
  await logEvent({
    type: "callback_req",
    code: source_code,
    meta: { suburb, page: page ?? null },
  });

  return { status: "success" };
}
