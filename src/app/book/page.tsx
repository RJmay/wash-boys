import type { Metadata } from "next";
import Link from "next/link";

import { Footer, StickyBar } from "@/components/site/chrome";
import { PhoneLink } from "@/components/site/tracking";
import { ctaQuiet, Section, SectionHeading } from "@/components/site/ui";
import { BUSINESS, PHONE_CONFIGURED } from "@/data/business";

export const metadata: Metadata = {
  title: `Book a clean — ${BUSINESS.name}`,
  description:
    "Book a driveway, house wash, patio or fence clean across the Caloundra to Buderim corridor.",
  robots: { index: false, follow: true },
};

/**
 * Placeholder. The four-step booking flow is session 3 (SPEC §5).
 *
 * It exists now so the landing page CTAs have somewhere real to go and give a
 * usable fallback rather than a 404. Session 3 replaces this file wholesale.
 */
export default function BookPage() {
  return (
    <>
      <StickyBar />
      <main>
        <Section labelledBy="book-heading">
          <SectionHeading id="book-heading">Online booking</SectionHeading>

          <p className="mt-3 text-ink-muted">
            The online booking flow is being built right now. In the meantime,
            give us a call and we will sort out a time — same crew, same
            prices, same guarantee.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {PHONE_CONFIGURED ? (
              <PhoneLink className="inline-flex items-center justify-center rounded-lg bg-hivis px-7 py-4 font-display text-xl tracking-wide text-ink uppercase">
                Call {BUSINESS.phone.display}
              </PhoneLink>
            ) : null}
            <Link href="/" className={ctaQuiet}>
              Back to the services
            </Link>
          </div>

          <p className="mt-6 text-sm text-ink-muted">
            {BUSINESS.pricingDisclaimer}
          </p>
        </Section>
      </main>
      <Footer />
    </>
  );
}
