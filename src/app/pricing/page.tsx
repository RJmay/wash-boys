import type { Metadata } from "next";

import { PageShell } from "@/components/site/chrome";
import {
  BookBand,
  BundleCards,
  DoubleStoreyNote,
  GutterGuardTable,
  PriceTableNote,
  ServicePriceList,
} from "@/components/site/sections";
import { Section, SectionHeading } from "@/components/site/ui";
import { DEPOSITS, formatPrice, GUTTER_GUARD, HEADLINE_BUNDLE } from "@/data/pricing";

export const metadata: Metadata = {
  title: "Bundles and Pricing",
  description: `${HEADLINE_BUNDLE.name} ${formatPrice(HEADLINE_BUNDLE.price)}: house wash, driveway, gutters and windows. Every price up front, GST included, single-storey homes.`,
  alternates: { canonical: "/pricing" },
};

/** Bundles first as large cards, then single services, then surcharges. */
export default function PricingPage() {
  return (
    <PageShell>
      <Section labelledBy="pricing-heading">
        <h1 id="pricing-heading" className="display-caps text-hero text-harbour">
          Bundles and pricing
        </h1>
        <BundleCards />
      </Section>

      <Section labelledBy="singles" className="bg-surface">
        <SectionHeading id="singles">Single services</SectionHeading>
        <ServicePriceList />
      </Section>

      <Section labelledBy="gg">
        <SectionHeading id="gg">Gutter guard</SectionHeading>
        <GutterGuardTable />
        <p className="mt-3 text-sm text-ink-muted">
          Valleys {formatPrice(GUTTER_GUARD.valleyEach)} each. {GUTTER_GUARD.overMaxNote}.
        </p>
      </Section>

      <Section labelledBy="extras" className="bg-surface">
        <SectionHeading id="extras">Extras and deposits</SectionHeading>
        <DoubleStoreyNote />
        <p className="mt-3 text-sm text-ink-muted">
          Deposit to hold your day: {formatPrice(DEPOSITS.cleaning)} for cleaning,{" "}
          {formatPrice(DEPOSITS.gutterGuard)} for gutter guard. The balance is invoiced on the day.
        </p>
        <PriceTableNote />
      </Section>

      <BookBand />
    </PageShell>
  );
}
