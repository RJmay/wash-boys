import type { Metadata } from "next";

import { BookingForm } from "@/components/book/booking-form";
import { PageShell } from "@/components/site/chrome";
import { Section } from "@/components/site/ui";
import {
  GUTTER_GUARD_SIZES,
  PACKAGE_CHOICES,
  SERVICE_IDS,
  type GutterGuardSize,
  type PackageChoice,
  type ServiceId,
} from "@/data/pricing";
import { isServicedSuburb } from "@/data/suburbs";
import { allUpcomingDays } from "@/lib/street-days";

export const metadata: Metadata = {
  title: "Book Your Day",
  description:
    "Book your exterior clean or gutter guard: pick a day we're in your suburb and hold it with a deposit.",
  alternates: { canonical: "/book" },
  // Nothing to gain from indexing a form.
  robots: { index: false, follow: true },
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Book page. Prefills from the query string so every "Book" link lands with
 * the choice already made:
 *   /book?package=exterior-refresh
 *   /book?package=single&services=gutter-clean
 *   /book?package=gutter-guard
 *   /book?suburb=buderim
 * `?src=` is read by the form itself (and the attribution cookie).
 */
export default async function BookPage({ searchParams }: PageProps<"/book">) {
  const params = await searchParams;

  const rawPackage = first(params.package);
  const initialPackage = (PACKAGE_CHOICES as readonly string[]).includes(rawPackage ?? "")
    ? (rawPackage as PackageChoice)
    : "exterior-refresh";

  const initialServices = (first(params.services) ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter((v): v is ServiceId => (SERVICE_IDS as readonly string[]).includes(v));

  const rawSize = first(params.size);
  const initialSize = (GUTTER_GUARD_SIZES as readonly string[]).includes(rawSize ?? "")
    ? (rawSize as GutterGuardSize)
    : undefined;

  const rawSuburb = first(params.suburb);
  const initialSuburb = rawSuburb && isServicedSuburb(rawSuburb) ? rawSuburb : "";

  return (
    <PageShell>
      <Section labelledBy="book-heading">
        <h1 id="book-heading" className="display-caps text-hero text-harbour">
          Book your day
        </h1>
        <BookingForm
          streetDays={allUpcomingDays()}
          initialPackage={initialPackage}
          initialServices={initialServices}
          initialSize={initialSize}
          initialSuburb={initialSuburb}
        />
      </Section>
    </PageShell>
  );
}
