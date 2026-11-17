import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/site/chrome";
import { StreetDaysLine } from "@/components/site/next-dates";
import {
  BundleCards,
  Closing,
  DoubleStoreyNote,
  Hero,
  HowItWorksSteps,
  NearYou,
  PriceTag,
  ServicePriceList,
} from "@/components/site/sections";
import { Section, SectionHeader } from "@/components/site/ui";
import { formatPrice, HEADLINE_BUNDLE } from "@/data/pricing";
import { SERVICE_PAGES } from "@/data/services";
import { getSuburb, SUBURBS } from "@/data/suburbs";
import { areaCopy } from "@/lib/area-copy";
import { breadcrumbs, JsonLd, serviceSchema } from "@/lib/schema";
import { upcomingDays } from "@/lib/street-days";

export function generateStaticParams() {
  return SUBURBS.map((s) => ({ suburb: s.slug }));
}

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
 * the price line comes straight after the heading and the suburb's own copy
 * follows the hero rather than preceding the button.
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
        headingClassName="text-section sm:text-[2.75rem] lg:text-[3.25rem] lg:leading-none"
        bookHref={bookHref}
      >
        <p className="text-lg text-white/90">
          {HEADLINE_BUNDLE.name}: <PriceTag amount={HEADLINE_BUNDLE.price} /> for a single-storey
          home.
        </p>
        <p className="text-white/85">
          <StreetDaysLine suburbName={suburb.name} dates={days} />
        </p>
      </Hero>

      <Section labelledBy="local-heading" tone="white">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 id="local-heading" className="eyebrow mb-3 text-harbour">
              {suburb.name}
            </h2>
            <p className="text-2xl leading-snug font-semibold text-ink sm:text-3xl">{copy.intro}</p>
            {copy.local ? <p className="mt-4 text-lg text-ink-muted">{copy.local}</p> : null}
          </div>
          <div>
            <h3 className="display-caps text-2xl text-harbour">What we see in {suburb.name}</h3>
            {copy.because.map((line) => (
              <p key={line} className="mt-4 text-ink-muted">
                {line}
              </p>
            ))}
            <p className="mt-4 text-ink-muted">{copy.logistics}</p>
          </div>
        </div>
      </Section>

      <Section labelledBy="prices-heading" tone="grey">
        <SectionHeader id="prices-heading" eyebrow="Prices" title={`Prices in ${suburb.name}`} />
        <BundleCards ids={["exterior-refresh", "full-exterior"]} />
        <div className="mt-14 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-16">
          <div>
            <h3 className="display-caps text-2xl text-harbour">Single services</h3>
            <p className="mt-3 text-ink-muted">Book any one on its own.</p>
            <DoubleStoreyNote />
          </div>
          <ServicePriceList suburbName={suburb.name} />
        </div>
      </Section>

      <HowItWorksSteps tone="white" />

      {copy.neighbours.length > 0 ? (
        <NearYou title={`Near ${suburb.name}`} suburbs={copy.neighbours} tone="grey" />
      ) : null}

      <Closing
        href={bookHref}
        label={`Book in ${suburb.name}`}
        tone={copy.neighbours.length > 0 ? "white" : "grey"}
      />
    </PageShell>
  );
}
