import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Footer, StickyBar } from "@/components/site/chrome";
import { cta, ctaQuiet, card, Section, SectionHeading } from "@/components/site/ui";
import { BUSINESS } from "@/data/business";
import { FAQ } from "@/data/faq";
import {
  getService,
  isBanded,
  SERVICES,
  serviceFromPrice,
  serviceRange,
} from "@/data/services";
import { REGIONS, suburbsInRegion } from "@/data/suburbs";
import { formatPrice, formatRange } from "@/lib/pricing";
import { breadcrumbs, faqSchema, JsonLd, serviceSchema } from "@/lib/schema";

export function generateStaticParams() {
  return SERVICES.filter((s) => s.active).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return {};

  const from = serviceFromPrice(service);
  const priced = service.pricing.kind !== "unpriced";

  return {
    title: `${service.name} — Caloundra to Buderim | ${BUSINESS.name}`,
    description: priced
      ? `${service.blurb} From ${formatPrice(from)}. Local, insured, owner-operated across the Caloundra to Buderim corridor.`
      : `${service.blurb} Join the waitlist and we will call you first.`,
    alternates: { canonical: `/services/${service.slug}` },
  };
}

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service || !service.active) notFound();

  const range = serviceRange(service);
  const priced = service.pricing.kind !== "unpriced";
  // Only the questions that actually bear on this service.
  const faqs = FAQ.filter((item) =>
    service.comingSoon
      ? /gutter/i.test(item.q)
      : !/gutter/i.test(item.q),
  ).slice(0, 6);

  return (
    <>
      <StickyBar />
      <JsonLd data={serviceSchema(service)} />
      <JsonLd data={faqSchema(faqs)} />
      <JsonLd
        data={breadcrumbs([
          { name: "Home", path: "/" },
          { name: service.name, path: `/services/${service.slug}` },
        ])}
      />

      <main>
        <section className="on-dark bg-harbour px-5 pt-10 pb-12">
          <div className="mx-auto w-full max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.18em] text-white/70 uppercase">
              {BUSINESS.base.city} to Buderim
            </p>
            <h1 className="display-caps text-hero mt-3 text-balance text-white">
              {service.name}
            </h1>
            <p className="mt-4 max-w-prose text-lg text-white/85">
              {service.description}
            </p>

            {priced ? (
              <p className="mt-5 font-display text-price text-hivis tabular-nums">
                From {formatPrice(range.low)}
                <span className="ml-2 font-sans text-sm font-normal text-white/70">
                  typically {formatRange(range.low, range.high)}
                </span>
              </p>
            ) : (
              <p className="mt-5 rounded-lg bg-white/10 px-4 py-3 text-white/85">
                Not bookable yet — and we will not quote it until it is.
              </p>
            )}

            <div className="mt-6">
              {service.bookable ? (
                <Link
                  href={{ pathname: "/book", query: { services: service.slug } }}
                  className={cta}
                >
                  Book in 60 seconds
                </Link>
              ) : (
                <Link href="/#gutter-waitlist" className={cta}>
                  Join the waitlist
                </Link>
              )}
            </div>
          </div>
        </section>

        {service.includes.length > 0 ? (
          <Section labelledBy="includes" className="bg-surface">
            <SectionHeading id="includes">What is included</SectionHeading>
            <ul className="mt-5 grid gap-3">
              {service.includes.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-ink">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="mt-1 size-4 shrink-0 fill-harbour"
                  >
                    <path d="M7.6 14.6 3.4 10.4l1.4-1.4 2.8 2.8 7-7 1.4 1.4z" />
                  </svg>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {isBanded(service) ? (
          <Section labelledBy="pricing">
            <SectionHeading id="pricing">What it costs</SectionHeading>
            <p className="mt-3 text-ink-muted">
              Priced on size, so a courtyard never pays for an entertaining
              deck. {BUSINESS.pricingDisclaimer}
            </p>
            <ul className="mt-5 grid gap-2">
              {service.pricing.bands.map((band) => (
                <li
                  key={band.id}
                  className="flex items-start justify-between gap-4 rounded-lg border border-line bg-surface px-4 py-3"
                >
                  <span>
                    <span className="block font-semibold text-ink">
                      {band.label}
                    </span>
                    <span className="block text-sm text-ink-muted">
                      {band.hint}
                    </span>
                  </span>
                  <span className="shrink-0 font-display text-lg text-harbour tabular-nums">
                    {band.quoteOnly
                      ? "Quoted"
                      : formatRange(band.priceLow, band.priceHigh)}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        <Section labelledBy="where" className="bg-surface">
          <SectionHeading id="where">Where we do it</SectionHeading>
          <p className="mt-3 text-ink-muted">
            The Caloundra to Buderim corridor, coast and inland. Based in{" "}
            {BUSINESS.base.suburb}, so most of these are a short run.
          </p>
          <div className="mt-5 space-y-4">
            {REGIONS.map((region) => (
              <div key={region}>
                <h3 className="text-sm font-semibold tracking-wide text-harbour uppercase">
                  {region}
                </h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {suburbsInRegion(region).map((suburb) => (
                    <li key={suburb.slug}>
                      <Link
                        href={`/areas/${suburb.slug}`}
                        className="inline-block rounded-full border border-line bg-surface px-3 py-1 text-sm text-ink hover:border-harbour/50"
                      >
                        {suburb.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section labelledBy="faq">
          <SectionHeading id="faq">Questions</SectionHeading>
          <div className="mt-5 divide-y divide-line border-y border-line">
            {faqs.map((item) => (
              <details key={item.q} className="group py-3">
                <summary className="cursor-pointer list-none font-semibold text-ink marker:hidden">
                  {item.q}
                </summary>
                <p className="mt-2 text-ink-muted">{item.a}</p>
              </details>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {service.bookable ? (
              <Link
                href={{ pathname: "/book", query: { services: service.slug } }}
                className={cta}
              >
                Book in 60 seconds
              </Link>
            ) : null}
            <Link href="/" className={ctaQuiet}>
              All services
            </Link>
          </div>
        </Section>

        <Section labelledBy="other" className="bg-surface">
          <SectionHeading id="other">While we are there</SectionHeading>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {SERVICES.filter((s) => s.active && s.slug !== service.slug).map(
              (other) => (
                <li key={other.slug} className={card}>
                  <Link href={`/services/${other.slug}`} className="block">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold text-ink">
                        {other.name}
                      </span>
                      {other.pricing.kind !== "unpriced" ? (
                        <span className="shrink-0 font-display text-harbour tabular-nums">
                          from {formatPrice(serviceFromPrice(other))}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-sm text-ink-muted">
                      {other.blurb}
                    </span>
                  </Link>
                </li>
              ),
            )}
          </ul>
        </Section>
      </main>
      <Footer />
    </>
  );
}
