import Link from "next/link";

import { BUNDLE_MIN_SERVICES, BUSINESS } from "@/data/business";
import { FAQ } from "@/data/faq";
import { proofPairs, reviews } from "@/data/site";
import { REGIONS, suburbsInRegion } from "@/data/suburbs";
import { BeforeAfterSlider } from "./before-after";
import { card, cta, Section, SectionHeading } from "./ui";

/** SPEC §4.4 — three steps, and the two promises that remove the risk. */
export function HowItWorks() {
  const steps = [
    {
      title: "Pick your services",
      body: "Tick what you want done. The estimate updates as you go, and two or more services take 15% off.",
    },
    {
      title: "Pick a time",
      body: "Half-day slots, Tuesday to Saturday. You will only see slots we can actually make.",
    },
    {
      title: "We confirm by text",
      body: "We text you back to lock in the arrival window. No account, no deposit, no waiting on hold.",
    },
  ];

  return (
    <Section labelledBy="how-heading" className="bg-surface">
      <SectionHeading id="how-heading">How it works</SectionHeading>

      <ol className="mt-6 grid gap-5 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3 sm:flex-col">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-harbour font-display text-lg text-white"
            >
              {index + 1}
            </span>
            <div>
              <h3 className="font-semibold text-ink">{step.title}</h3>
              <p className="mt-1 text-sm text-ink-muted">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-6 border-t border-line pt-5 text-sm text-ink-muted">
        {BUSINESS.pricingDisclaimer}
      </p>
    </Section>
  );
}

/** SPEC §4.5 — the ticket-builder. Auto-applies in the booking flow. */
export function BundleNudge() {
  return (
    <Section>
      <div className="flex flex-col items-start gap-4 rounded-xl bg-harbour px-6 py-8 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="display-caps text-3xl">
            Book {BUNDLE_MIN_SERVICES}+ services, save{" "}
            {BUSINESS.bundleDiscountPct}%
          </p>
          <p className="mt-1 text-white/85">
            Most places get the driveway and the house done together. The
            discount comes off automatically.
          </p>
        </div>
      </div>
    </Section>
  );
}

/**
 * SPEC §4.6 — proof strip. Hides itself entirely until there are real photos
 * or real reviews. An empty testimonial rail is worse than none, and a stock
 * one is not an option (CLAUDE.md).
 */
export function ProofStrip() {
  if (proofPairs.length === 0 && reviews.length === 0) return null;

  return (
    <Section labelledBy="proof-heading" className="bg-surface">
      <SectionHeading id="proof-heading">Recent work</SectionHeading>

      {proofPairs.length > 0 ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {proofPairs.map((pair) => (
            <BeforeAfterSlider key={pair.before} pair={pair} />
          ))}
        </div>
      ) : null}

      {reviews.length > 0 ? (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {reviews.map((review) => (
            <li key={review.quote} className={card}>
              <p className="text-ink">{review.quote}</p>
              <p className="mt-2 text-sm text-ink-muted">
                {review.author} — {review.suburb}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  );
}

/**
 * SPEC §4.7 — service area. The chips are plain text for now; they become
 * links to /areas/[suburb] in session 6 when those pages exist. Linking to
 * routes that 404 would be worse than not linking.
 */
export function ServiceArea() {
  return (
    <Section id="area" labelledBy="area-heading">
      <SectionHeading id="area-heading">Where we work</SectionHeading>

      <p className="mt-3 text-ink-muted">
        The Caloundra to Buderim corridor, coast and inland. Based in{" "}
        {BUSINESS.base.suburb}, so most of these are a short run for us.
      </p>

      <div className="mt-6 space-y-5">
        {REGIONS.map((region) => (
          <div key={region}>
            <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-harbour uppercase">
              <span aria-hidden="true" className="h-px w-6 bg-harbour/40" />
              {region}
            </h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {suburbsInRegion(region).map((suburb) => (
                <li
                  key={suburb.slug}
                  className="rounded-full border border-line bg-surface px-3 py-1 text-sm text-ink"
                >
                  {suburb.name}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-6 text-sm text-ink-muted">
        Not on the list? Start a booking anyway and leave your number — we are
        adding suburbs as we go.
      </p>
    </Section>
  );
}

/** SPEC §4.9 — details/summary, so it works with JavaScript disabled. */
export function Faq() {
  return (
    <Section id="faq" labelledBy="faq-heading" className="bg-surface">
      <SectionHeading id="faq-heading">Questions</SectionHeading>

      <div className="mt-6 divide-y divide-line border-y border-line">
        {FAQ.map((item) => (
          <details key={item.q} className="group py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-ink marker:hidden">
              {item.q}
              <span
                aria-hidden="true"
                className="shrink-0 text-harbour transition group-open:rotate-45"
              >
                <svg viewBox="0 0 20 20" className="size-5 fill-current">
                  <path d="M9 4h2v12H9z" />
                  <path d="M4 9h12v2H4z" />
                </svg>
              </span>
            </summary>
            <p className="mt-2 text-ink-muted">{item.a}</p>
          </details>
        ))}
      </div>

      <div className="mt-8">
        <Link href="/book" className={cta}>
          Book in 60 seconds
        </Link>
      </div>
    </Section>
  );
}
