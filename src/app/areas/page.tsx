import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/site/chrome";
import { CorridorMap } from "@/components/site/corridor-map";
import { BookBand } from "@/components/site/sections";
import { Section, SectionHeading } from "@/components/site/ui";
import { BUSINESS } from "@/data/business";
import { formatPrice, HEADLINE_BUNDLE } from "@/data/pricing";
import { PRIORITY_SUBURBS, SUBURBS } from "@/data/suburbs";

export const metadata: Metadata = {
  title: "Service Areas: Buderim to Pelican Waters",
  description: `House washing, pressure cleaning, gutter cleaning and gutter guard across ${SUBURBS.length} Sunshine Coast suburbs, from Buderim and Kuluin to Pelican Waters. Based in ${BUSINESS.base.suburb}.`,
  alternates: { canonical: "/areas" },
};

export default function AreasPage() {
  return (
    <PageShell>
      <Section labelledBy="areas-heading">
        <h1 id="areas-heading" className="display-caps text-hero text-harbour">
          Service areas
        </h1>
        <p className="mt-3 text-ink-muted">
          We&apos;re based in {BUSINESS.base.suburb} and book whole streets on set days, so
          there&apos;s no call-out fee. {HEADLINE_BUNDLE.name}{" "}
          {formatPrice(HEADLINE_BUNDLE.price)} in every suburb below.
        </p>

        <h2 className="mt-8 text-sm font-semibold tracking-wide text-harbour uppercase">
          Booking now
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {PRIORITY_SUBURBS.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/areas/${s.slug}`}
                className="block rounded-lg border border-line bg-surface px-4 py-3 font-semibold text-ink hover:border-harbour/50"
              >
                {s.name} <span className="font-normal text-ink-muted">{s.postcode}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section labelledBy="all-heading" className="bg-surface">
        <SectionHeading id="all-heading">Every suburb we cover</SectionHeading>
        <CorridorMap />
        <p className="mt-6 text-sm text-ink-muted">
          Not on the list? Choose &ldquo;Other&rdquo; on the booking form and we&apos;ll call you.
        </p>
      </Section>

      <BookBand />
    </PageShell>
  );
}
