"use server";

import { logEvent } from "./events";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { fieldErrors, leadSchema } from "@/lib/validation";

/**
 * Out-of-area catch from booking step 2 (SPEC §5).
 *
 * "We're not in [X] yet — leave your number and we'll call if we head that
 * way." Logged as a lead, never as a booking, so nobody is promised a job we
 * cannot do. Which suburbs keep asking is the input to the next flyer wave.
 */

export type LeadState =
  | { status: "idle" }
  | { status: "error"; errors: Record<string, string> }
  | { status: "success" };

export async function captureLead(
  _prev: LeadState,
  formData: FormData,
): Promise<LeadState> {
  const parsed = leadSchema.safeParse({
    kind: "out_of_area",
    name: formData.get("name") || undefined,
    phone: formData.get("phone"),
    suburb: formData.get("suburb"),
    message: formData.get("message") || undefined,
    source_code: formData.get("source_code") || undefined,
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
      errors: { form: "Could not save that just now. Please try again." },
    };
  }

  // The lead row is the contact record; the event keeps the funnel maths whole.
  await logEvent({
    type: "lead_out_of_area",
    code: source_code,
    meta: { suburb },
  });

  return { status: "success" };
}
