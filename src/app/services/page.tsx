import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/site/chrome";
import { Closing, DoubleStoreyNote } from "@/components/site/sections";
import { Arrow, card, PageHeader, Section, textLink, TickList } from "@/components/site/ui";
import { formatPrice, GUTTER_GUARD_FROM, HEADLINE_BUNDLE } from "@/data/pricing";
import { SERVICE_PAGES, servicePrice } from "@/data/services";

export const metadata: Metadata = {
  title: "Services: House Wash, Driveways, Gutters & Windows",
  description:
    "House soft washing, driveway and path pressure cleaning, gutter cleaning, exterior windows and gutter guard on the Sunshine Coast. Fixed prices, GST included.",
  alternates: { canonical: "/services" },
};

function ServiceCard({
  title,
  price,
  body,
  includes,
  bookHref,
  detailHref,
}: {
  title: string;
  price: string;
  body: string;
  includes: readonly string[];
  bookHref: string;
  detailHref: string;
}) {
  return (
    <li className={`${card} flex flex-col`}>
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-2 font-display text-price text-harbour">{price}</p>
      <p className="mt-4 text-ink-muted">{body}</p>
      <TickList items={includes} className="mt-5 border-t border-line pt-5 text-sm text-ink" />
      <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-2 pt-6">
        <Link href={bookHref} className={textLink}>
          Book <Arrow />
        </Link>
        <Link href={detailHref} className="text-sm font-semibold text-ink-muted underline underline-offset-4 hover:text-ink">
          More detail
        </Link>
      </div>
    </li>
  );
}

/** Services: every service as a card, each linking to its own page. */
export default function ServicesPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Fixed prices, GST included"
        title="Services"
        lead={
          <p>
            Fixed prices for a single-storey home, GST included. Or get the house, driveway,
            gutters and windows done in one day with the{" "}
            <Link href="/pricing" className="font-semibold text-white underline underline-offset-4">
              {HEADLINE_BUNDLE.name}
            </Link>
            .
          </p>
        }
      />

      <Section tone="grey">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICE_PAGES.map((page) => {
            const { name, label } = servicePrice(page);
            return (
              <ServiceCard
                key={page.slug}
                title={name}
                price={label}
                body={page.body[0]}
                includes={page.includes}
                bookHref={`/book?package=single&services=${page.pricingId}`}
                detailHref={`/services/${page.slug}`}
              />
            );
          })}
          <ServiceCard
            title="Gutter guard, fitted"
            price={`from ${formatPrice(GUTTER_GUARD_FROM)}`}
            body="Aluminium mesh, fitted to your gutters and valleys, with a gutter clean first. Fixed price by gutter length, no sales visit."
            includes={["Gutter clean included", "Mesh fitted to all gutters and valleys", "Offcuts removed"]}
            bookHref="/book?package=gutter-guard"
            detailHref="/gutter-guard"
          />
        </ul>
        <DoubleStoreyNote className="mt-8" />
      </Section>

      <Closing tone="white" />
    </PageShell>
  );
}
