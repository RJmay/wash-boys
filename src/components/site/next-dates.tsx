"use client";

import { useSyncExternalStore } from "react";

import { SHOW_PLACEHOLDERS } from "@/data/placeholders";
import { addDays, formatShortDate, todayISO } from "@/lib/dates";
import { NEXT_DATES_PLACEHOLDER } from "@/lib/street-days";
import { Placeholder } from "./ui";

const subscribe = () => () => {};

/**
 * The suburb hero's street-days line. The page is static, so the server
 * renders the days as of the last deploy; in the browser, days that have
 * since passed are dropped.
 *
 * With no days left: the [NEXT DATES] placeholder while developing, and in a
 * production build the same promise the booking form makes when a suburb has
 * no listed days - pick a day, we confirm it by phone.
 */
export function StreetDaysLine({
  suburbName,
  dates,
  limit = 3,
}: {
  suburbName: string;
  dates: string[];
  limit?: number;
}) {
  const today = useSyncExternalStore(subscribe, () => todayISO(), () => "");
  const upcoming = (today ? dates.filter((d) => d >= addDays(today, 1)) : dates).slice(0, limit);

  if (upcoming.length > 0) {
    return (
      <>
        We&apos;re booking {suburbName} streets on:{" "}
        <strong>{upcoming.map(formatShortDate).join(", ")}</strong>
      </>
    );
  }

  if (SHOW_PLACEHOLDERS) {
    return (
      <>
        We&apos;re booking {suburbName} streets on: <Placeholder value={NEXT_DATES_PLACEHOLDER} />
      </>
    );
  }

  return (
    <>Pick a day that suits and we&apos;ll confirm it by phone, matched to when we&apos;re in your street.</>
  );
}
