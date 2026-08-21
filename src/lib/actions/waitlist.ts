"use server";

import { createAdminSupabase } from "@/lib/supabase/admin";
import { fieldErrors, waitlistSchema } from "@/lib/validation";

export type WaitlistState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; errors: Record<string, string> };

/**
 * Gutter waitlist (CLAUDE.md). The only thing a gutter enquiry is ever allowed
 * to become until the service is live - never a booking, never a price.
 *
 * Plain form action so it works with JavaScript disabled.
 */
export async function joinWaitlist(
  _prev: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  const parsed = waitlistSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    suburb: formData.get("suburb") || undefined,
    source_code: formData.get("source_code") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", errors: fieldErrors(parsed.error) };
  }

  const { name, phone, suburb, source_code, service_slug } = parsed.data;

  try {
    const { error } = await createAdminSupabase()
      .from("service_waitlist")
      .insert({
        service_slug,
        name,
        phone,
        suburb: suburb ?? null,
        source_code: source_code ?? null,
      });

    if (error) throw error;
  } catch {
    return {
      status: "error",
      errors: {
        form: "Could not save that just now. Please try again, or call us.",
      },
    };
  }

  // No funnel event is logged here on purpose. `service_waitlist` already
  // carries created_at and source_code, so it is the record of a waitlist
  // join - counting these off `events` as well would give two sources of
  // truth that drift, and none of the SPEC §6 event types describes a
  // waitlist join honestly.
  return { status: "success" };
}
