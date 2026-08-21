"use server";

import { createAdminSupabase } from "@/lib/supabase/admin";
import { eventSchema, type EventInput } from "@/lib/validation";

/**
 * Funnel logging (SPEC §1, §7). Every step from scan to booked job is counted
 * per printed QR code, and that table is how suburbs get ranked from wave 2.
 *
 * Two rules:
 *  - it is fire-and-forget. Analytics must never break a page or block a
 *    booking, so every failure here is swallowed;
 *  - unknown codes are safe. The database trigger moves an unrecognised code
 *    into `meta.unknown_code` rather than rejecting the insert, so a mistyped
 *    flyer code costs a data point, not the event.
 */
export async function logEvent(input: EventInput): Promise<void> {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return;

  const { type, code, meta } = parsed.data;

  try {
    await createAdminSupabase()
      .from("events")
      .insert({
        type,
        code: code ?? null,
        meta: (meta ?? null) as never,
      });
  } catch {
    // Supabase not configured yet, or a transient failure. Either way the
    // visitor must never see it.
  }
}
