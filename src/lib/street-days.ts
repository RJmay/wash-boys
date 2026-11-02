import streetDays from "@/data/street-days.json";
import { addDays, formatShortDate, todayISO } from "./dates";

/**
 * Street days: we book whole streets of a suburb on set days, so the booking
 * form offers a suburb's listed days rather than an open calendar.
 *
 * The owner edits src/data/street-days.json by hand as rounds are planned.
 * Nothing here invents a date: a suburb with no upcoming days shows the
 * [NEXT DATES] placeholder and the form falls back to a free date picker,
 * with the day confirmed by phone.
 */

export const NEXT_DATES_PLACEHOLDER = "[NEXT DATES]";

/** How far ahead the free date picker runs when a suburb has no street days. */
export const OPEN_PICKER_DAYS = 90;

export const CAPACITY_PER_DAY: number = streetDays.capacityPerDay;

const DAYS = streetDays.days as Record<string, string[]>;

/** Upcoming street days for a suburb, soonest first. Tomorrow onwards. */
export function upcomingDays(suburbSlug: string, today = todayISO()): string[] {
  const tomorrow = addDays(today, 1);
  return [...(DAYS[suburbSlug] ?? [])]
    .filter((iso) => iso >= tomorrow)
    .sort();
}

/** "Wed 18 Nov, Sat 21 Nov" or the visible placeholder. */
export function upcomingDaysLabel(suburbSlug: string, limit = 3): string {
  const days = upcomingDays(suburbSlug).slice(0, limit);
  return days.length ? days.map(formatShortDate).join(", ") : NEXT_DATES_PLACEHOLDER;
}

/** Every suburb's upcoming days, for the booking form. */
export function allUpcomingDays(): Record<string, string[]> {
  return Object.fromEntries(
    Object.keys(DAYS).map((slug) => [slug, upcomingDays(slug)]),
  );
}
