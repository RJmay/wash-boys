import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/site/chrome";
import { Closing, GutterGuardTable, NearYou, ServiceWork } from "@/components/site/sections";
import { cta, PageHeader, Placeholder, Section, SectionHeader, TickList } from "@/components/site/ui";
import { isShown, PLACEHOLDERS } from "@/data/placeholders";
import {
  DOUBLE_STOREY,
  formatPrice,
  GUTTER_GUARD,
  GUTTER_GUARD_FROM,
  packageLength,
} from "@/data/pricing";
import { JsonLd, serviceSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: `Gutter Guard Installed, Sunshine Coast: from ${formatPrice(GUTTER_GUARD_FROM)}`,
  description: `Aluminium mesh gutter guard fitted to your gutters and valleys, gutter clean included. Fixed price by gutter length from ${formatPrice(GUTTER_GUARD_FROM)}, no sales visit.`,
  alternates: { canonical: "/gutter-guard" },
};

const INCLUDED = [
  "Gutter clean",
  "Mesh fitted to all gutters and valleys",
  "Offcuts removed",
  "Before-and-after photos",
];

/**
 * Gutter Guard (docs/brief/site-content.md). Packages stop at Large on
 * purpose: gutter guard is invoiced as its own line and kept under the QBCC
 * threshold, so anything bigger is quoted by phone.
 */
export default function GutterGuardPage() {
  const medium = GUTTER_GUARD.packages.find((p) => p.id === "gutter-guard-medium");
  return (
    <PageShell>
      <JsonLd data={serviceSchema("gutter-guard")} />

      <PageHeader
        eyebrow="Gutter guard"
        title="Never clean your gutters again."
        lead={
          <p>
            Aluminium mesh gutter guard, fitted to your gutters and valleys, with a gutter clean
            first. Fixed price by gutter length, no sales visit.
          </p>
        }
        aside={
          <div className="rounded-2xl bg-surface p-6 text-ink sm:p-8">
            <h2 className="eyebrow text-harbour">What&apos;s included</h2>
            <TickList items={INCLUDED} className="mt-4" />
            {isShown(PLACEHOLDERS.gutterGuardWarranty) ? (
              <p className="mt-6 border-t border-line pt-5 text-sm text-ink-muted">
                <Placeholder value={PLACEHOLDERS.gutterGuardWarranty} />
              </p>
            ) : null}
          </div>
        }
      >
        <p className="font-display text-price text-hivis">from {formatPrice(GUTTER_GUARD_FROM)}</p>
        <div className="pt-2">
          <Link href="/book?package=gutter-guard" className={cta}>
            Book gutter guard
          </Link>
        </div>
      </PageHeader>

      <Section labelledBy="packages-heading" tone="white">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-16">
          <div>
            <SectionHeader
              id="packages-heading"
              eyebrow="Packages"
              title="Priced by gutter length"
              lead={
                <>
                  Not sure of your gutter length? Most single-storey 3 to 4 bedroom homes are{" "}
                  {medium ? `${medium.name} (${packageLength(medium)})` : "Medium"}. Book and
                  we&apos;ll confirm with a quick phone measure.
                </>
              }
            />
          </div>
          <div>
            <GutterGuardTable />
            <p className="mt-4 text-sm text-ink-muted">
              Valleys {formatPrice(GUTTER_GUARD.valleyEach)} each. Double-storey +
              {formatPrice(DOUBLE_STOREY.gutterGuard)}. Bigger homes: we&apos;ll quote by phone.
            </p>
          </div>
        </div>
      </Section>

      <ServiceWork service="gutter-guard" name="Gutter guard fitted" tone="grey" />

      <NearYou title="Gutter guard near you" prefix="gutter guard" tone="white" />

      <Closing
        title="Book gutter guard"
        body="Pick your day and pay the deposit. We confirm your gutter length by phone before the day."
        href="/book?package=gutter-guard"
        label="Book gutter guard"
        tone="grey"
      />
    </PageShell>
  );
}
