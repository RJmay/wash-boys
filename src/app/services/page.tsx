import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/site/chrome";
import { BookBand, DoubleStoreyNote } from "@/components/site/sections";
import { Section, SectionHeading, TickList } from "@/components/site/ui";
import { formatPrice, GUTTER_GUARD_FROM } from "@/data/pricing";
import { SERVICE_PAGES, servicePrice } from "@/data/services";

export const metadata: Metadata = {
  title: "Services: House Wash, Driveways, Gutters & Windows",
  description:
    "House soft washing, driveway and path pressure cleaning, gutter cleaning, exterior windows and gutter guard on the Sunshine Coast. Fixed prices, GST included.",
  alternates: { canonical: "/services" },
};

/** Services: one section per service, each linking to its own page. */
export default function ServicesPage() {
  return (
    <PageShell>
      <Section labelledBy="services-heading">
        <h1 id="services-heading" className="display-caps text-hero text-harbour">
          Services
        </h1>
        <p className="mt-3 text-ink-muted">
          Fixed prices for a single-storey home, GST included. Or get the lot in one morning
          with the{" "}
          <Link href="/pricing" className="font-semibold text-harbour underline underline-offset-4">
            Exterior Refresh
          </Link>
          .
        </p>
        <DoubleStoreyNote />
      </Section>

      {SERVICE_PAGES.map((page, i) => {
        const { name, label } = servicePrice(page);
        return (
          <Section
            key={page.slug}
            id={page.slug}
            labelledBy={`${page.slug}-heading`}
            className={i % 2 === 0 ? "bg-surface" : ""}
          >
            <SectionHeading id={`${page.slug}-heading`}>
              {name}, {label}
            </SectionHeading>
            {page.body.map((para) => (
              <p key={para} className="mt-3 text-ink-muted">
                {para}
              </p>
            ))}
            <TickList items={page.includes} className="mt-4 text-ink" />
            <Link
              href={`/services/${page.slug}`}
              className="mt-5 inline-flex font-semibold text-harbour underline underline-offset-4"
            >
              More on {name.toLowerCase()} <span aria-hidden="true">&nbsp;→</span>
            </Link>
          </Section>
        );
      })}

      <Section id="gutter-guard" labelledBy="gg-heading" className="bg-surface">
        <SectionHeading id="gg-heading">
          Gutter guard, from {formatPrice(GUTTER_GUARD_FROM)}
        </SectionHeading>
        <p className="mt-3 text-ink-muted">
          Aluminium mesh, fitted, gutter clean included. Fixed price by gutter length.
        </p>
        <Link
          href="/gutter-guard"
          className="mt-5 inline-flex font-semibold text-harbour underline underline-offset-4"
        >
          See the Gutter Guard page <span aria-hidden="true">&nbsp;→</span>
        </Link>
      </Section>

      <BookBand />
    </PageShell>
  );
}
