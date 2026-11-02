import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/site/chrome";
import { NextDates } from "@/components/site/next-dates";
import {
  BookBand,
  BundleCards,
  DoubleStoreyNote,
  Hero,
  HowItWorksSteps,
  PriceTag,
  ServicePriceList,
} from "@/components/site/sections";
import { Section, SectionHeading } from "@/components/site/ui";
import { formatPrice, HEADLINE_BUNDLE } from "@/data/pricing";
import { SERVICE_PAGES } from "@/data/services";
import { getSuburb, SUBURBS } from "@/data/suburbs";
import { areaCopy } from "@/lib/area-copy";
import { breadcrumbs, JsonLd, serviceSchema } from "@/lib/schema";
import { upcomingDays } from "@/lib/street-days";

export function generateStaticParams() {
  return SUBURBS.map((s) => ({ suburb: s.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/areas/[suburb]">): Promise<Metadata> {
  const { suburb: slug } = await params;
  const suburb = getSuburb(slug);
  if (!suburb) return {};

  return {
    title: `House Washing & Gutter Cleaning ${suburb.name}`,
    description: `House washing, pressure cleaning, gutter cleaning and gutter guard in ${suburb.name} ${suburb.postcode}. ${HEADLINE_BUNDLE.name} ${formatPrice(HEADLINE_BUNDLE.price)}, fixed price, done in one morning.`,
    alternates: { canonical: `/areas/${suburb.slug}` },
  };
}

/**
 * Suburb page (docs/brief/site-content.md, "Service Areas").
 *
 * Targets "house washing / pressure cleaning / gutter cleaning / gutter guard
 * [suburb]". The $790 and the Book button sit above the fold on a phone, so
 * the price line comes straight after the heading and the blurb follows the
 * button rather than preceding it.
 */
export default async function AreaPage({
  params,
}: PageProps<"/areas/[suburb]">) {
  const { suburb: slug } = await params;
  const suburb = getSuburb(slug);
  if (!suburb) notFound();

  const copy = areaCopy(suburb);
  const days = upcomingDays(suburb.slug);
  const bookHref = { pathname: "/book", query: { suburb: suburb.slug } };

  return (
    <PageShell>
      {SERVICE_PAGES.map((page) => (
        <JsonLd key={page.slug} data={serviceSchema(page, suburb)} />
      ))}
      <JsonLd data={serviceSchema("gutter-guard", suburb)} />
      <JsonLd
        data={breadcrumbs([
          { name: "Home", path: "/" },
          { name: "Service areas", path: "/areas" },
          { name: suburb.name, path: `/areas/${suburb.slug}` },
        ])}
      />

      <Hero
        eyebrow={`${suburb.name} ${suburb.postcode}`}
        heading={`House washing and gutter cleaning in ${suburb.name}`}
        headingClassName="text-section"
        bookHref={bookHref}
      >
        <p className="text-lg text-white/90">
          {HEADLINE_BUNDLE.name}: <PriceTag amount={HEADLINE_BUNDLE.price} /> for a single-storey
          home.
        </p>
        <p className="text-white/85">
          We&apos;re booking {suburb.name} streets on: <NextDates dates={days} />
        </p>
      </Hero>

      <Section labelledBy="local" className="bg-surface">
        <h2 id="local" className="sr-only">
          {suburb.name}
        </h2>
        <p className="text-lg text-ink">{copy.intro}</p>
        {copy.local ? <p className="mt-3 text-ink-muted">{copy.local}</p> : null}
      </Section>

      <Section labelledBy="bundle">
        <SectionHeading id="bundle">The {HEADLINE_BUNDLE.name}</SectionHeading>
        <BundleCards ids={["exterior-refresh", "full-exterior"]} />
      </Section>

      <Section labelledBy="services" className="bg-surface">
        <SectionHeading id="services">Services in {suburb.name}</SectionHeading>
        <ServicePriceList suburbName={suburb.name} />
        <DoubleStoreyNote />
      </Section>

      <Section labelledBy="why">
        <SectionHeading id="why">What we see in {suburb.name}</SectionHeading>
        {copy.because.map((line) => (
          <p key={line} className="mt-3 text-ink-muted">
            {line}
          </p>
        ))}
        <p className="mt-3 text-ink-muted">{copy.logistics}</p>
      </Section>

      <HowItWorksSteps className="bg-surface" />

      {copy.neighbours.length > 0 ? (
        <Section labelledBy="nearby">
          <SectionHeading id="nearby">Nearby</SectionHeading>
          <ul className="mt-4 flex flex-wrap gap-2">
            {copy.neighbours.map((n) => (
              <li key={n.slug}>
                <Link
                  href={`/areas/${n.slug}`}
                  className="inline-block rounded-full border border-line bg-surface px-3 py-1 text-sm text-ink hover:border-harbour/50"
                >
                  {n.name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/areas"
                className="inline-block rounded-full border border-harbour px-3 py-1 text-sm font-semibold text-harbour"
              >
                All suburbs
              </Link>
            </li>
          </ul>
        </Section>
      ) : null}

      <BookBand href={bookHref} label={`Book in ${suburb.name}`} />
    </PageShell>
  );
}
