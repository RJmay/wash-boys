import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/site/chrome";
import {
  BookBand,
  BundleCards,
  DoubleStoreyNote,
  RecentWork,
} from "@/components/site/sections";
import { cta, Section, SectionHeading, TickList } from "@/components/site/ui";
import { formatPrice, HEADLINE_BUNDLE } from "@/data/pricing";
import { getServicePage, SERVICE_PAGES, servicePrice } from "@/data/services";
import { PRIORITY_SUBURBS } from "@/data/suburbs";
import { breadcrumbs, JsonLd, serviceSchema } from "@/lib/schema";

export function generateStaticParams() {
  return SERVICE_PAGES.map((s) => ({ slug: s.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/services/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = getServicePage(slug);
  if (!page) return {};
  const { name, label, from } = servicePrice(page);

  return {
    title: `${page.heading}, Sunshine Coast: ${label}`,
    description: from
      ? `${name} on the Sunshine Coast: ${label}, priced by length and confirmed by phone, GST included. Add it to the ${formatPrice(HEADLINE_BUNDLE.price)} ${HEADLINE_BUNDLE.name}.`
      : `${name} on the Sunshine Coast: ${label} for a single-storey home, GST included. Or get it in the ${formatPrice(HEADLINE_BUNDLE.price)} ${HEADLINE_BUNDLE.name}.`,
    alternates: { canonical: `/services/${page.slug}` },
  };
}

export default async function ServicePage({
  params,
}: PageProps<"/services/[slug]">) {
  const { slug } = await params;
  const page = getServicePage(slug);
  if (!page) notFound();
  const { name, label, from } = servicePrice(page);

  return (
    <PageShell>
      <JsonLd data={serviceSchema(page)} />
      <JsonLd
        data={breadcrumbs([
          { name: "Home", path: "/" },
          { name: "Services", path: "/services" },
          { name, path: `/services/${page.slug}` },
        ])}
      />

      <section className="on-dark bg-harbour px-5 pt-8 pb-10 text-white">
        <div className="mx-auto w-full max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-white/70 uppercase">
            Sunshine Coast
          </p>
          <h1 className="display-caps text-hero mt-3 text-balance">{page.heading}</h1>
          <p className="mt-4 font-display text-price text-hivis">
            {label}
            <span className="ml-2 font-sans text-sm font-normal text-white/75">
              {from ? "confirmed by phone, GST incl." : "single-storey home, GST incl."}
            </span>
          </p>
          {page.body.map((para) => (
            <p key={para} className="mt-3 max-w-prose text-white/85">
              {para}
            </p>
          ))}
          <div className="mt-6">
            <Link href={`/book?package=single&services=${page.pricingId}`} className={cta}>
              Book your day
            </Link>
          </div>
        </div>
      </section>

      <Section labelledBy="includes" className="bg-surface">
        <SectionHeading id="includes">What&apos;s included</SectionHeading>
        <TickList items={page.includes} className="mt-5 text-ink" />
        <DoubleStoreyNote />
      </Section>

      <Section labelledBy="bundle">
        <SectionHeading id="bundle">Save with a bundle</SectionHeading>
        <p className="mt-3 text-ink-muted">
          Getting more than one thing done? The {HEADLINE_BUNDLE.name} does the house, driveway,
          gutters and windows in one morning.
        </p>
        <BundleCards ids={["exterior-refresh", "full-exterior"]} />
      </Section>

      <RecentWork only={[page.photoService]} />

      <Section labelledBy="where">
        <SectionHeading id="where">{page.heading} near you</SectionHeading>
        <ul className="mt-4 flex flex-wrap gap-2">
          {PRIORITY_SUBURBS.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/areas/${s.slug}`}
                className="inline-block rounded-full border border-line bg-surface px-3 py-1 text-sm text-ink hover:border-harbour/50"
              >
                {page.keyword} {s.name}
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <BookBand />
    </PageShell>
  );
}
