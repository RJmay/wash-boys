import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Footer, StickyBar } from "@/components/site/chrome";
import { PhoneLink } from "@/components/site/tracking";
import { card, cta, ctaQuiet, Section, SectionHeading } from "@/components/site/ui";
import { BUSINESS } from "@/data/business";
import { getService, serviceFromPrice } from "@/data/services";
import { getSuburb, SUBURBS } from "@/data/suburbs";
import { areaCopy } from "@/lib/area-copy";
import { formatPrice } from "@/lib/pricing";
import { breadcrumbs, JsonLd, serviceSchema } from "@/lib/schema";

export function generateStaticParams() {
  return SUBURBS.map((s) => ({ suburb: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ suburb: string }>;
}): Promise<Metadata> {
  const { suburb: slug } = await params;
  const suburb = getSuburb(slug);
  if (!suburb) return {};

  return {
    title: `Pressure washing in ${suburb.name} | ${BUSINESS.name}`,
    description: `Driveway, house, patio and fence cleaning in ${suburb.name} ${suburb.postcode}. ${suburb.hook}`,
    alternates: { canonical: `/areas/${suburb.slug}` },
  };
}

export default async function AreaPage({
  params,
}: {
  params: Promise<{ suburb: string }>;
}) {
  const { suburb: slug } = await params;
  const suburb = getSuburb(slug);
  if (!suburb) notFound();

  const copy = areaCopy(suburb);
  const isBase = suburb.slug === "aroona";

  return (
    <>
      <StickyBar />
      <JsonLd data={serviceSchema(getService("house-washing")!, suburb.name)} />
      <JsonLd
        data={breadcrumbs([
          { name: "Home", path: "/" },
          { name: suburb.name, path: `/areas/${suburb.slug}` },
        ])}
      />

      <main>
        <section className="on-dark bg-harbour px-5 pt-10 pb-12">
          <div className="mx-auto w-full max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.18em] text-white/70 uppercase">
              {suburb.region} · {suburb.postcode}
            </p>
            <h1 className="display-caps text-hero mt-3 text-balance text-white">
              Pressure washing in {suburb.name}
            </h1>
            <p className="mt-4 max-w-prose text-lg text-white/85">
              {copy.intro}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={{ pathname: "/book", query: { suburb: suburb.slug } }}
                className={cta}
              >
                Book in 60 seconds
              </Link>
              <PhoneLink className="inline-flex items-center justify-center rounded-lg border-2 border-white/40 px-5 py-3 font-semibold text-white">
                Call {BUSINESS.phone.display}
              </PhoneLink>
            </div>
          </div>
        </section>

        <Section labelledBy="why" className="bg-surface">
          <SectionHeading id="why">
            What we see in {suburb.name}
          </SectionHeading>
          {copy.because.map((line) => (
            <p key={line} className="mt-3 text-ink-muted">
              {line}
            </p>
          ))}
          <p className="mt-3 text-ink-muted">{copy.logistics}</p>
        </Section>

        <Section labelledBy="services">
          <SectionHeading id="services">
            What we clean in {suburb.name}
          </SectionHeading>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {copy.services.map((slugName) => {
              const service = getService(slugName);
              if (!service) return null;
              return (
                <li key={service.slug} className={card}>
                  <Link href={`/services/${service.slug}`} className="block">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold text-ink">
                        {service.name}
                      </span>
                      <span className="shrink-0 font-display text-harbour tabular-nums">
                        from {formatPrice(serviceFromPrice(service))}
                      </span>
                    </span>
                    <span className="mt-1 block text-sm text-ink-muted">
                      {service.blurb}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-sm text-ink-muted">
            {BUSINESS.pricingDisclaimer} Two or more services take{" "}
            {BUSINESS.bundleDiscountPct}% off.
          </p>
        </Section>

        {copy.neighbours.length > 0 ? (
          <Section labelledBy="nearby" className="bg-surface">
            <SectionHeading id="nearby">Nearby</SectionHeading>
            <p className="mt-3 text-ink-muted">
              {isBase
                ? "Everything close to home."
                : `We cover the whole ${suburb.region} end of the corridor.`}
            </p>
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
                  href="/#area"
                  className="inline-block rounded-full border border-harbour px-3 py-1 text-sm font-semibold text-harbour"
                >
                  All suburbs
                </Link>
              </li>
            </ul>
          </Section>
        ) : null}

        <Section labelledBy="cta">
          <div className="rounded-xl bg-harbour px-6 py-8 text-white">
            <p className="display-caps text-3xl">
              Booked in under two minutes
            </p>
            <p className="mt-2 text-white/85">
              No account, no deposit. We text you to confirm the arrival
              window, and you pay on the day once you have had a look at it.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={{ pathname: "/book", query: { suburb: suburb.slug } }}
                className={cta}
              >
                Book in {suburb.name}
              </Link>
              <Link href="/" className={`${ctaQuiet} border-white/40 text-white`}>
                See all services
              </Link>
            </div>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
