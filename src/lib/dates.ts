/**
 * Date helpers pinned to Queensland time.
 *
 * The server runs in UTC on Vercel. A booking made at 8am Brisbane is still
 * "yesterday" in UTC, so anything comparing a booking date to "today" has to
 * go through here or it will reject valid same-day bookings for 10 hours a
 * day. Queensland has no daylight saving, so a fixed zone is safe.
 */

export const TIMEZONE = "Australia/Brisbane";

/** How far ahead the date picker runs (SPEC §5 step 3). */
export const BOOKING_WINDOW_DAYS = 14;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Today in Brisbane as YYYY-MM-DD. */
export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isISODate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

/** Calendar arithmetic on YYYY-MM-DD, free of timezone drift. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`; negative when `to` is in the past. */
export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const ms = Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd);
  return Math.round(ms / 86_400_000);
}

/** 0 = Sunday ... 6 = Saturday. */
export function dayOfWeek(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * Working days: Tuesday to Saturday, plus Sunday PM as optional overflow.
 * Monday is off, and a Sunday morning never is - noise (CLAUDE.md).
 */
export function isWorkingSlot(iso: string, slot: "am" | "pm"): boolean {
  const dow = dayOfWeek(iso);
  if (dow >= 2 && dow <= 6) return true;
  return dow === 0 && slot === "pm";
}

/** "Sat 23 Aug" - compact enough for a slot button at 375px. */
export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** "Saturday 23 August" - confirmation screens and emails. */
export function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/**
 * Half-days only. We deliberately do not publish arrival times - the booking
 * confirmation promises a text with the exact window instead (SPEC §5), and
 * promising "7am" on a page we cannot always hit is a bad first impression.
 */
export const SLOT_LABELS = {
  am: "Morning",
  pm: "Afternoon",
} as const;

/** Sunday overflow starts late on purpose - petrol washers are loud. */
export const SUNDAY_PM_NOTE = "Sunday jobs start after 11am.";
