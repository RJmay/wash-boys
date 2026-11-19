import type { Metadata } from "next";

import { PageShell } from "@/components/site/chrome";
import {
  BundleCards,
  Closing,
  DrivewayTable,
  GutterGuardTable,
  ServicePriceList,
} from "@/components/site/sections";
import { card, PageHeader, Section, SectionHeader } from "@/components/site/ui";
import { PRICE_TABLE_NOTE } from "@/data/copy";
import {
  DEPOSITS,
  DOUBLE_STOREY,
  DRIVEWAY_OVER_MAX_NOTE,
  formatPrice,
  GUTTER_GUARD,
  HEADLINE_BUNDLE,
} from "@/data/pricing";

export const metadata: Metadata = {
  title: "Bundles and Pricing",
  description: `${HEADLINE_BUNDLE.name} ${formatPrice(HEADLINE_BUNDLE.price)}: house wash, driveway, gutters and windows. Every price up front, GST included, single-storey homes.`,
  alternates: { canonical: "/pricing" },
};

/** Bundles first as large cards, then single services and gutter guard, then extras. */
export default function PricingPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Every price, up front"
        title="Bundles and pricing"
        lead={<p>{PRICE_TABLE_NOTE}</p>}
      />

      <Section labelledBy="bundles-heading" tone="grey">
        <SectionHeader
          id="bundles-heading"
          eyebrow="Bundles"
          title="Save when you bundle"
        />
        <BundleCards />
      </Section>

      <Section labelledBy="singles-heading" tone="white">
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeader id="singles-heading" eyebrow="Single services" title="One thing at a time" />
            <div className="mt-8">
              <ServicePriceList />
            </div>
            <h3 className="mt-10 font-semibold text-ink">Driveway sizes</h3>
            <p className="mt-1 text-sm text-ink-muted">Priced by how many cars fit on it.</p>
            <div className="mt-4">
              <DrivewayTable />
            </div>
            <p className="mt-4 text-sm text-ink-muted">{DRIVEWAY_OVER_MAX_NOTE}</p>
          </div>
          <div>
            <SectionHeader eyebrow="Gutter guard" title="Fitted, by gutter length" />
            <div className="mt-8">
              <GutterGuardTable />
            </div>
            <p className="mt-4 text-sm text-ink-muted">
              Valleys {formatPrice(GUTTER_GUARD.valleyEach)} each. {GUTTER_GUARD.overMaxNote}.
            </p>
          </div>
        </div>
      </Section>

      <Section labelledBy="extras-heading" tone="grey">
        <SectionHeader id="extras-heading" eyebrow="Good to know" title="Extras and deposits" />
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          <li className={card}>
            <h3 className="font-semibold text-ink">Double-storey</h3>
            <p className="mt-2 text-ink-muted">
              +{formatPrice(DOUBLE_STOREY.washingAndWindows)} on washing and windows, +
              {formatPrice(DOUBLE_STOREY.gutterGuard)} on gutter guard.
            </p>
          </li>
          <li className={card}>
            <h3 className="font-semibold text-ink">Deposit</h3>
            <p className="mt-2 text-ink-muted">
              {formatPrice(DEPOSITS.cleaning)} for cleaning, {formatPrice(DEPOSITS.gutterGuard)} for
              gutter guard, by bank transfer to hold your day. The balance is invoiced after the job.
            </p>
          </li>
          <li className={card}>
            <h3 className="font-semibold text-ink">Not sure of your size?</h3>
            <p className="mt-2 text-ink-muted">
              Book anyway and we&apos;ll confirm by phone before the day.
            </p>
          </li>
        </ul>
      </Section>

      <Closing tone="white" />
    </PageShell>
  );
}
