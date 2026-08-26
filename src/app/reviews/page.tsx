import type { Metadata } from "next";
import Link from "next/link";

import { Footer, StickyBar } from "@/components/site/chrome";
import { card, cta, Section, SectionHeading } from "@/components/site/ui";
import { BUSINESS } from "@/data/business";
import { reviews } from "@/data/site";

export const metadata: Metadata = {
  title: `Reviews — ${BUSINESS.name}`,
  description: `What customers say about ${BUSINESS.name}, pressure washing across the Caloundra to Buderim corridor.`,
  alternates: { canonical: "/reviews" },
};

/**
 * Reviews (SPEC §3).
 *
 * Real Google reviews only, pasted in as they land. No markup is emitted while
 * the list is empty: Review schema with nothing behind it is the kind of thing
 * that gets a business penalised, and inventing one is not on the table.
 */
export default function ReviewsPage() {
  return (
    <>
      <StickyBar />
      <main>
        <Section labelledBy="reviews-heading">
          <SectionHeading id="reviews-heading">Reviews</SectionHeading>

          {reviews.length === 0 ? (
            <div className="mt-5 rounded-xl border border-line bg-surface p-6">
              <p className="text-ink">
                We are new, and we would rather show you nothing than show you
                something we wrote ourselves.
              </p>
              <p className="mt-3 text-ink-muted">
                Every review on this page will be a real Google review from a
                real job. Until there are some, the offer stands on its own:{" "}
                {BUSINESS.trust.insured.toLowerCase()}, {BUSINESS.base.suburb}
                -based and owner-operated, and{" "}
                {BUSINESS.trust.guarantee.toLowerCase()}
              </p>
              <p className="mt-3 text-ink-muted">
                If you are weighing us up, the before and afters on the home
                page are all our own work.
              </p>
              <div className="mt-6">
                <Link href="/book" className={cta}>
                  Book in 60 seconds
                </Link>
              </div>
            </div>
          ) : (
            <ul className="mt-5 grid gap-4 sm:grid-cols-2">
              {reviews.map((review) => (
                <li key={review.quote} className={card}>
                  <p className="text-ink">{review.quote}</p>
                  <p className="mt-2 text-sm text-ink-muted">
                    {review.author} — {review.suburb}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </main>
      <Footer />
    </>
  );
}
