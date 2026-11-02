"use client";

import { useSyncExternalStore } from "react";

import { addDays, formatShortDate, todayISO } from "@/lib/dates";
import { NEXT_DATES_PLACEHOLDER } from "@/lib/street-days";
import { Placeholder } from "./ui";

const subscribe = () => () => {};

/**
 * A suburb's next street days. The page is static, so the server renders the
 * days as of the last deploy; in the browser, days that have since passed are
 * dropped. With no days left it shows the [NEXT DATES] placeholder.
 */
export function NextDates({ dates, limit = 3 }: { dates: string[]; limit?: number }) {
  const today = useSyncExternalStore(subscribe, () => todayISO(), () => "");
  const upcoming = (today ? dates.filter((d) => d >= addDays(today, 1)) : dates).slice(0, limit);

  if (upcoming.length === 0) return <Placeholder value={NEXT_DATES_PLACEHOLDER} />;
  return <strong>{upcoming.map(formatShortDate).join(", ")}</strong>;
}
