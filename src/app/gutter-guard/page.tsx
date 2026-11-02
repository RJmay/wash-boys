import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/site/chrome";
import { BookBand, GutterGuardTable, RecentWork } from "@/components/site/sections";
import { cta, Placeholder, Section, SectionHeading, TickList } from "@/components/site/ui";
import { PLACEHOLDERS } from "@/data/placeholders";
import {
  DOUBLE_STOREY,
  formatPrice,
  GUTTER_GUARD,
  GUTTER_GUARD_FROM,
  packageLength,
} from "@/data/pricing";
import { PRIORITY_SUBURBS } from "@/data/suburbs";
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

      <section className="on-dark bg-harbour px-5 pt-8 pb-10 text-white">
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="display-caps text-hero text-balance">Never clean your gutters again.</h1>
          <p className="mt-4 max-w-prose text-white/85">
            Aluminium mesh gutter guard, fitted to your gutters and valleys, with a gutter clean
            first. Fixed price by gutter length, no sales visit.
          </p>
          <p className="mt-4 font-display text-price text-hivis">
            from {formatPrice(GUTTER_GUARD_FROM)}
          </p>
          <div className="mt-6">
            <Link href="/book?package=gutter-guard" className={cta}>
              Book gutter guard
            </Link>
          </div>
        </div>
      </section>

      <Section labelledBy="packages" className="bg-surface">
        <SectionHeading id="packages">Packages</SectionHeading>
        <GutterGuardTable />
        <p className="mt-4 text-sm text-ink-muted">
          Valleys {formatPrice(GUTTER_GUARD.valleyEach)} each. Double-storey +
          {formatPrice(DOUBLE_STOREY.gutterGuard)}. Bigger homes: we&apos;ll quote by phone.
        </p>
        <p className="mt-3 text-ink-muted">
          Not sure of your gutter length? Most single-storey 3 to 4 bedroom homes are{" "}
          {medium ? `${medium.name} (${packageLength(medium)})` : "Medium"}. Book and we&apos;ll
          confirm with a quick phone measure.
        </p>
      </Section>

      <Section labelledBy="included">
        <SectionHeading id="included">What&apos;s included</SectionHeading>
        <TickList items={INCLUDED} className="mt-5 text-ink" />
        <p className="mt-5 text-sm text-ink-muted">
          <Placeholder value={PLACEHOLDERS.gutterGuardWarranty} />
        </p>
      </Section>

      <RecentWork only={["gutter-guard"]} />

      <Section labelledBy="where">
        <SectionHeading id="where">Gutter guard near you</SectionHeading>
        <ul className="mt-4 flex flex-wrap gap-2">
          {PRIORITY_SUBURBS.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/areas/${s.slug}`}
                className="inline-block rounded-full border border-line bg-surface px-3 py-1 text-sm text-ink hover:border-harbour/50"
              >
                gutter guard {s.name}
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <BookBand
        title="Book gutter guard"
        body="Pick your day and pay the deposit. We confirm your gutter length by phone before the day."
        href="/book?package=gutter-guard"
        label="Book gutter guard"
      />
    </PageShell>
  );
}
