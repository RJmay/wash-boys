import type { Metadata } from "next";

import { BookingFlow } from "@/components/book/booking-flow";
import { Footer, StickyBar } from "@/components/site/chrome";
import { Section } from "@/components/site/ui";
import { BUSINESS } from "@/data/business";
import { isServiceSlug, type ServiceSlug } from "@/data/services";
import { isServicedSuburb } from "@/data/suburbs";
import { getAvailability } from "@/lib/actions/availability";

export const metadata: Metadata = {
  title: `Book a clean — ${BUSINESS.name}`,
  description:
    "Book a driveway, house wash, patio or fence clean across the Caloundra to Buderim corridor. Two minutes, no account, no deposit.",
  // Nothing to gain from indexing a form, and it would compete with the
  // landing page for the same terms.
  robots: { index: false, follow: true },
};

/** Availability is per-request: a slot booked a minute ago must show as gone. */
export const dynamic = "force-dynamic";

/**
 * Booking page (SPEC §5).
 *
 * Prefills from the query string so "Add to booking" on a service card and
 * "Book a clean in Buderim" on the map both land with the work already
 * started. `?services=driveway-cleaning,house-washing&suburb=buderim`
 */
export default async function BookPage({
  searchParams,
}: PageProps<"/book">) {
  const params = await searchParams;

  const rawServices = params.services;
  const requested = (Array.isArray(rawServices) ? rawServices : [rawServices])
    .filter((v): v is string => typeof v === "string")
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    // Only bookable slugs survive - a hand-typed ?services=gutter-cleaning
    // must not preselect something we do not sell.
    .filter((v): v is ServiceSlug => isServiceSlug(v) && v !== "gutter-cleaning");

  const rawSuburb = Array.isArray(params.suburb)
    ? params.suburb[0]
    : params.suburb;
  const suburb =
    typeof rawSuburb === "string" && isServicedSuburb(rawSuburb)
      ? rawSuburb
      : "";

  const slots = await getAvailability();

  return (
    <>
      <StickyBar />
      <main>
        <Section labelledBy="book-heading">
          <h1 id="book-heading" className="sr-only">
            Book a clean
          </h1>
          <BookingFlow
            slots={slots}
            initialServices={[...new Set(requested)]}
            initialSuburb={suburb}
          />
        </Section>
      </main>
      <Footer />
    </>
  );
}
