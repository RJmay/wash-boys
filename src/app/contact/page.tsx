import type { Metadata } from "next";
import Link from "next/link";

import { CorridorMap } from "@/components/site/corridor-map";
import { Footer, StickyBar } from "@/components/site/chrome";
import { PhoneLink } from "@/components/site/tracking";
import { cta, Section, SectionHeading } from "@/components/site/ui";
import { BUSINESS } from "@/data/business";
import { JsonLd, localBusiness } from "@/lib/schema";

export const metadata: Metadata = {
  title: `Contact — ${BUSINESS.name}`,
  description: `Call ${BUSINESS.phone.display} or book online. Local, owner-operated pressure washing from ${BUSINESS.base.suburb}, covering the Caloundra to Buderim corridor.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <StickyBar />
      <JsonLd data={localBusiness()} />
      <main>
        <Section labelledBy="contact-heading">
          <SectionHeading id="contact-heading">Get in touch</SectionHeading>

          <div className="mt-5 grid gap-4">
            <div className="rounded-xl border border-line bg-surface p-5">
              <h2 className="text-sm font-semibold tracking-wide text-harbour uppercase">
                Phone
              </h2>
              <p className="mt-2">
                <PhoneLink className="font-display text-price text-ink underline underline-offset-4">
                  {BUSINESS.phone.display}
                </PhoneLink>
              </p>
              <p className="mt-2 text-sm text-ink-muted">
                {BUSINESS.hours.days}. {BUSINESS.hours.note}
              </p>
            </div>

            <div className="rounded-xl border border-line bg-surface p-5">
              <h2 className="text-sm font-semibold tracking-wide text-harbour uppercase">
                Email
              </h2>
              <p className="mt-2">
                <a
                  href={`mailto:${BUSINESS.email}`}
                  className="text-lg text-ink underline underline-offset-4"
                >
                  {BUSINESS.email}
                </a>
              </p>
              <p className="mt-2 text-sm text-ink-muted">
                Best for photos of an unusual job. For a normal booking, the
                form is faster.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-surface p-5">
              <h2 className="text-sm font-semibold tracking-wide text-harbour uppercase">
                The business
              </h2>
              <p className="mt-2 text-ink">
                {BUSINESS.name} — ABN {BUSINESS.abn}
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                Based in {BUSINESS.base.suburb}, {BUSINESS.base.city}. We are a
                service-area business, so there is no shopfront to visit — we
                come to you.
              </p>
              <p className="mt-2 text-sm text-ink-muted">
                {BUSINESS.trust.insured}. {BUSINESS.trust.guarantee}
              </p>
            </div>
          </div>

          <div className="mt-8">
            <Link href="/book" className={cta}>
              Book in 60 seconds
            </Link>
          </div>
        </Section>

        <Section labelledBy="where-heading" className="bg-surface">
          <SectionHeading id="where-heading">Where we work</SectionHeading>
          <CorridorMap />
        </Section>
      </main>
      <Footer />
    </>
  );
}
