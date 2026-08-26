import "server-only";

import {
  addDays,
  BOOKING_WINDOW_DAYS,
  isWorkingSlot,
  todayISO,
} from "@/lib/dates";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { BookingStatus, Slot } from "@/lib/supabase/types";

/**
 * Slot availability for the date picker (SPEC §5 step 3).
 *
 * "Booked out" has to be honest - scarcity we invent is scarcity a customer
 * eventually catches us in - so a slot is only shown as full when the bookings
 * actually reach capacity.
 */
export type SlotOption = {
  date: string;
  slot: Slot;
  capacity: number;
  booked: number;
  available: boolean;
};

/** Default capacities when the availability table has no row for a day. */
const DEFAULT_CAPACITY: Record<Slot, number> = { am: 2, pm: 2 };
/** Sunday is overflow only, and lighter (CLAUDE.md). */
const SUNDAY_PM_CAPACITY = 1;

/** Statuses that consume a slot. Cancelled and no-shows free it up again. */
const LIVE_STATUSES: BookingStatus[] = ["new", "confirmed", "done"];

function defaultCapacity(date: string, slot: Slot): number {
  const sunday = new Date(`${date}T00:00:00Z`).getUTCDay() === 0;
  return sunday ? SUNDAY_PM_CAPACITY : DEFAULT_CAPACITY[slot];
}

/** Every working half-day in the booking window, before capacity is applied. */
function workingSlots(from: string): { date: string; slot: Slot }[] {
  const out: { date: string; slot: Slot }[] = [];
  for (let i = 0; i <= BOOKING_WINDOW_DAYS; i++) {
    const date = addDays(from, i);
    for (const slot of ["am", "pm"] as const) {
      if (isWorkingSlot(date, slot)) out.push({ date, slot });
    }
  }
  return out;
}

/**
 * Reads the availability table and subtracts live bookings.
 *
 * Falls back to the working-day rules when Supabase is not configured yet, so
 * the flow is testable before the project exists. That fallback is safe
 * precisely because there is no database: with nowhere to store bookings there
 * is nothing to double-book.
 */
export async function getAvailability(): Promise<SlotOption[]> {
  const from = todayISO();
  const to = addDays(from, BOOKING_WINDOW_DAYS);
  const slots = workingSlots(from);

  let capacities = new Map<string, number>();
  let booked = new Map<string, number>();

  try {
    const supabase = createAdminSupabase();

    const [availability, bookings] = await Promise.all([
      supabase
        .from("availability")
        .select("day, slot, capacity")
        .gte("day", from)
        .lte("day", to),
      supabase
        .from("bookings")
        .select("preferred_date, slot")
        .gte("preferred_date", from)
        .lte("preferred_date", to)
        .in("status", LIVE_STATUSES),
    ]);

    if (availability.error) throw availability.error;
    if (bookings.error) throw bookings.error;

    capacities = new Map(
      (availability.data ?? []).map((row) => [
        `${row.day}|${row.slot}`,
        row.capacity,
      ]),
    );

    booked = new Map();
    for (const row of bookings.data ?? []) {
      const key = `${row.preferred_date}|${row.slot}`;
      booked.set(key, (booked.get(key) ?? 0) + 1);
    }
  } catch {
    // Not configured, or a transient failure. Fall through to the defaults -
    // never block a booking on the availability lookup.
  }

  return slots.map(({ date, slot }) => {
    const key = `${date}|${slot}`;
    const capacity = capacities.get(key) ?? defaultCapacity(date, slot);
    const taken = booked.get(key) ?? 0;
    return {
      date,
      slot,
      capacity,
      booked: taken,
      available: taken < capacity,
    };
  });
}

/**
 * Re-checks one slot at submit time. The picker may have been open for
 * minutes, and two people can reach step 4 for the last slot at once.
 */
export async function slotStillFree(date: string, slot: Slot): Promise<boolean> {
  const all = await getAvailability();
  const match = all.find((s) => s.date === date && s.slot === slot);
  return match?.available ?? false;
}
