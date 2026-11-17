import type { Metadata } from "next";

import { PageShell } from "@/components/site/chrome";
import { CorridorMap } from "@/components/site/corridor-map";
import { Closing, SuburbGrid } from "@/components/site/sections";
import { PageHeader, Section, SectionHeader } from "@/components/site/ui";
import { BUSINESS } from "@/data/business";
import { formatPrice, HEADLINE_BUNDLE } from "@/data/pricing";
import { SUBURBS } from "@/data/suburbs";

export const metadata: Metadata = {
  title: "Service Areas: Buderim to Pelican Waters",
  description: `House washing, pressure cleaning, gutter cleaning and gutter guard across ${SUBURBS.length} Sunshine Coast suburbs, from Buderim and Kuluin to Pelican Waters. Based in ${BUSINESS.base.suburb}.`,
  alternates: { canonical: "/areas" },
};

export default function AreasPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow={`Based in ${BUSINESS.base.suburb}`}
        title="Service areas"
        lead={
          <p>
            We book whole streets on set days, so there&apos;s no call-out fee.{" "}
            {HEADLINE_BUNDLE.name} {formatPrice(HEADLINE_BUNDLE.price)} in every suburb below.
          </p>
        }
      />

      <Section labelledBy="now-heading" tone="grey">
        <SectionHeader id="now-heading" eyebrow="Booking now" title="Suburbs we're booking now" />
        <div className="mt-10">
          <SuburbGrid />
        </div>
      </Section>

      <Section labelledBy="all-heading" tone="white">
        <SectionHeader
          id="all-heading"
          eyebrow={`${SUBURBS.length} suburbs`}
          title="Every suburb we cover"
          lead="Not on the list? Choose “Other” on the booking form and we’ll call you."
        />
        <div className="max-w-4xl">
          <CorridorMap />
        </div>
      </Section>

      <Closing tone="grey" />
    </PageShell>
  );
}
