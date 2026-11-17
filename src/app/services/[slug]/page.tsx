import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/site/chrome";
import {
  BundleCards,
  Closing,
  DoubleStoreyNote,
  NearYou,
  ServiceWork,
} from "@/components/site/sections";
import { cta, PageHeader, Section, SectionHeader, TickList } from "@/components/site/ui";
import { formatPrice, HEADLINE_BUNDLE } from "@/data/pricing";
import { getServicePage, SERVICE_PAGES, servicePrice } from "@/data/services";
import { breadcrumbs, JsonLd, serviceSchema } from "@/lib/schema";

export function generateStaticParams() {
  return SERVICE_PAGES.map((s) => ({ slug: s.slug }));
}

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

      <PageHeader
        eyebrow="Sunshine Coast"
        title={page.heading}
        aside={
          <div className="rounded-2xl bg-surface p-6 text-ink sm:p-8">
            <h2 className="eyebrow text-harbour">What&apos;s included</h2>
            <TickList items={page.includes} className="mt-4" />
            <DoubleStoreyNote className="mt-6 border-t border-line pt-5" />
          </div>
        }
      >
        <p className="font-display text-price text-hivis">
          {label}
          <span className="ml-2 font-sans text-sm font-normal text-white/75">
            {from ? "confirmed by phone, GST incl." : "single-storey home, GST incl."}
          </span>
        </p>
        {page.body.map((para) => (
          <p key={para} className="max-w-prose text-white/85">
            {para}
          </p>
        ))}
        <div className="pt-2">
          <Link href={`/book?package=single&services=${page.pricingId}`} className={cta}>
            Book your day
          </Link>
        </div>
      </PageHeader>

      <ServiceWork service={page.photoService} name={name} tone="grey" />

      <Section labelledBy="bundle-heading" tone="white">
        <SectionHeader
          id="bundle-heading"
          eyebrow="Save with a bundle"
          title="Getting more than one thing done?"
          lead={`The ${HEADLINE_BUNDLE.name} does the house, driveway, gutters and windows in one morning.`}
        />
        <BundleCards ids={["exterior-refresh", "full-exterior"]} />
      </Section>

      <NearYou title={`${page.heading} near you`} prefix={page.keyword} tone="grey" />

      <Closing tone="white" />
    </PageShell>
  );
}
