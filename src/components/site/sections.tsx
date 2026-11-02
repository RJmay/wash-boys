import Link from "next/link";
import type { ReactNode } from "react";

import { BUSINESS } from "@/data/business";
import {
  GUTTER_GUARD_TEASER,
  HEADLINE_PRICE,
  HOW_IT_WORKS_SHORT,
  PRICE_TABLE_NOTE,
  REFRESH_COMPARE,
  REFRESH_INCLUDES,
} from "@/data/copy";
import { FAQ } from "@/data/faq";
import { PLACEHOLDERS } from "@/data/placeholders";
import {
  BUNDLES,
  DOUBLE_STOREY,
  formatPrice,
  GUTTER_GUARD,
  HEADLINE_BUNDLE,
  itemName,
  packageLength,
  type Bundle,
} from "@/data/pricing";
import { SERVICE_PAGES, servicePrice } from "@/data/services";
import { pairsFor, PHOTO_SLOTS, reviews } from "@/data/site";
import { PRIORITY_SUBURBS } from "@/data/suburbs";
import { BeforeAfterSlider } from "./before-after";
import { card, cta, ctaQuiet, Placeholder, Section, SectionHeading, TickList } from "./ui";

/**
 * Above-the-fold hero for the home page and every suburb page.
 *
 * The brief's hard requirement: the bundle price and a Book button are
 * visible without scrolling on a phone. So this block is text only, the
 * headline is short, and the price and button sit directly under it - no
 * image above them. The sticky bar carries "Book $790" as well, as a second
 * guarantee.
 */
export function Hero({
  eyebrow,
  heading,
  children,
  bookHref = "/book",
  secondary = { href: "/pricing", label: "See all prices" },
  headingClassName = "text-hero",
}: {
  headingClassName?: string;
  eyebrow?: string;
  heading: string;
  children: ReactNode;
  bookHref?: string | { pathname: string; query: Record<string, string> };
  secondary?: { href: string; label: string };
}) {
  return (
    <section className="on-dark bg-harbour px-5 pt-6 pb-8 text-white sm:pt-12 sm:pb-14">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3.5">
        {eyebrow ? (
          <p className="text-xs font-semibold tracking-[0.18em] text-white/70 uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className={`display-caps text-balance ${headingClassName}`}>{heading}</h1>
        {children}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link href={bookHref} className={cta}>
            Book your day
          </Link>
          <Link
            href={secondary.href}
            className="font-semibold text-white underline underline-offset-4"
          >
            {secondary.label}
          </Link>
        </div>
      </div>
    </section>
  );
}

export function PriceTag({ amount }: { amount: number }) {
  return <strong className="font-display text-price text-hivis">{formatPrice(amount)}</strong>;
}

export function RefreshIncludes() {
  return (
    <Section labelledBy="refresh-heading" className="bg-surface">
      <SectionHeading id="refresh-heading">
        What&apos;s in the {HEADLINE_BUNDLE.name}
      </SectionHeading>
      <TickList items={REFRESH_INCLUDES} className="mt-5 text-ink" />
      <p className="mt-5 font-semibold text-ink">{REFRESH_COMPARE}</p>
      <div className="mt-6">
        <Link href="/book?package=exterior-refresh" className={ctaQuiet}>
          Book the {HEADLINE_BUNDLE.name}
        </Link>
      </div>
    </Section>
  );
}

export function HowItWorksSteps({
  steps = HOW_IT_WORKS_SHORT,
  headingId = "how-heading",
  className = "",
  asPageHeading = false,
}: {
  steps?: readonly { title: string; body: string }[];
  headingId?: string;
  className?: string;
  /** Renders the heading as the page's h1. */
  asPageHeading?: boolean;
}) {
  return (
    <Section labelledBy={headingId} className={className}>
      {asPageHeading ? (
        <h1 id={headingId} className="display-caps text-hero text-harbour">
          How it works
        </h1>
      ) : (
        <SectionHeading id={headingId}>How it works</SectionHeading>
      )}
      <ol className="mt-6 grid gap-5">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-harbour font-display text-lg text-white"
            >
              {index + 1}
            </span>
            <p className="pt-1.5 text-ink">
              <strong>{step.title}</strong> {step.body}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function GutterGuardTeaser() {
  return (
    <Section labelledBy="gg-heading">
      <div className="rounded-xl bg-harbour px-6 py-8 text-white">
        <h2 id="gg-heading" className="display-caps text-3xl">
          Gutter guard
        </h2>
        <p className="mt-2 text-white/85">{GUTTER_GUARD_TEASER}</p>
        <Link
          href="/gutter-guard"
          className="mt-5 inline-flex font-semibold text-white underline underline-offset-4"
        >
          Gutter guard prices <span aria-hidden="true">&nbsp;→</span>
        </Link>
      </div>
    </Section>
  );
}

export function WhereWeWork() {
  const names = PRIORITY_SUBURBS.slice(0, 6).map((s) => s.name);
  return (
    <Section id="area" labelledBy="area-heading" className="bg-surface">
      <SectionHeading id="area-heading">Where we work</SectionHeading>
      <p className="mt-3 text-ink-muted">
        {names.slice(0, -1).join(", ")} and {names.at(-1)} and nearby.
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {PRIORITY_SUBURBS.map((s) => (
          <li key={s.slug}>
            <Link
              href={`/areas/${s.slug}`}
              className="inline-block rounded-full border border-line bg-surface px-3 py-1 text-sm text-ink hover:border-harbour/50"
            >
              {s.name}
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/areas"
        className="mt-5 inline-flex font-semibold text-harbour underline underline-offset-4"
      >
        See your suburb <span aria-hidden="true">&nbsp;→</span>
      </Link>
    </Section>
  );
}

/** Trust strip - only what is true today, plus visible placeholders. */
export function TrustStrip() {
  const items = [
    BUSINESS.trust.team,
    BUSINESS.trust.softWash,
    BUSINESS.trust.drains,
  ];
  return (
    <Section labelledBy="trust-heading">
      <h2 id="trust-heading" className="sr-only">
        Why book us
      </h2>
      <TickList items={items} className="text-ink" />
      <ul className="mt-3 grid gap-2.5 text-sm text-ink-muted">
        <li>
          <Placeholder value={PLACEHOLDERS.insurance} />
        </li>
        {reviews.length === 0 ? (
          <li>
            <Placeholder value={PLACEHOLDERS.reviews} />
          </li>
        ) : null}
      </ul>
      {reviews.length > 0 ? (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {reviews.map((review) => (
            <li key={review.quote} className={card}>
              <p className="text-ink">{review.quote}</p>
              <p className="mt-2 text-sm text-ink-muted">
                {review.author}, {review.suburb}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  );
}

const PHOTO_PLACEHOLDER = {
  "gutter-clean": PLACEHOLDERS.gutterPhoto,
  windows: PLACEHOLDERS.windowsPhoto,
  "gutter-guard": PLACEHOLDERS.gutterGuardPhoto,
} as const;

/**
 * Real before-and-afters, one slot per service. A service without a real pair
 * yet shows its placeholder. Add pairs in src/data/site.ts.
 */
export function RecentWork({
  only,
}: {
  only?: (typeof PHOTO_SLOTS)[number]["service"][];
}) {
  const slots = PHOTO_SLOTS.filter((s) => !only || only.includes(s.service));
  return (
    <Section labelledBy="work-heading" className="bg-surface">
      <SectionHeading id="work-heading">Recent work</SectionHeading>
      <ul className="mt-6 grid gap-5 sm:grid-cols-2">
        {slots.map((slot) => {
          const pair = pairsFor(slot.service)[0];
          return (
            <li key={slot.service}>
              <h3 className="mb-2 text-sm font-semibold tracking-wide text-harbour uppercase">
                {slot.label}
              </h3>
              {pair ? (
                <BeforeAfterSlider pair={pair} />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center rounded-xl border-2 border-dashed border-line-strong bg-concrete p-4 text-center text-sm text-ink-muted">
                  <Placeholder
                    value={
                      PHOTO_PLACEHOLDER[slot.service as keyof typeof PHOTO_PLACEHOLDER] ??
                      "[PLACEHOLDER: photo]"
                    }
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

export function FaqList({ headingLevel = "h2" }: { headingLevel?: "h1" | "h2" }) {
  const Heading = headingLevel;
  return (
    <Section id="faq" labelledBy="faq-heading" className="bg-surface">
      <Heading id="faq-heading" className="display-caps text-section text-harbour">
        Questions
      </Heading>
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
            <p className="mt-2 text-ink-muted">
              <Placeholder value={item.a} />
            </p>
          </details>
        ))}
      </div>
    </Section>
  );
}

// ── Pricing blocks ────────────────────────────────────────────────────────

export function BundleCard({ bundle }: { bundle: Bundle }) {
  const bookable = bundle.id !== "annual-refresh";
  return (
    <li className={`${card} flex flex-col gap-3 ${bundle.headline ? "border-2 border-harbour" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-semibold text-ink">{bundle.name}</h3>
        <p className="shrink-0 text-right">
          <span className="block font-display text-price text-harbour">
            {formatPrice(bundle.price)}
            {bundle.billing ? <span className="font-sans text-sm text-ink-muted"> a year</span> : null}
          </span>
          {bundle.saving ? (
            <span className="text-sm font-semibold text-ink">save {formatPrice(bundle.saving)}</span>
          ) : null}
        </p>
      </div>
      <p className="text-ink-muted">{bundle.includes.map(itemName).join(" + ")}</p>
      {bundle.id === "annual-refresh" ? (
        <p className="text-sm text-ink-muted">
          The {HEADLINE_BUNDLE.name} again every October, before storm season. Offered after your first job.
        </p>
      ) : null}
      {bookable ? (
        <Link
          href={`/book?package=${bundle.id}`}
          className="mt-auto inline-flex w-fit items-center gap-1 font-semibold text-harbour underline underline-offset-4"
        >
          Book the {bundle.name} <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </li>
  );
}

export function BundleCards({ ids }: { ids?: Bundle["id"][] }) {
  const list = BUNDLES.filter((b) => !ids || ids.includes(b.id));
  return (
    <ul className="mt-6 grid gap-4">
      {list.map((bundle) => (
        <BundleCard key={bundle.id} bundle={bundle} />
      ))}
    </ul>
  );
}

/** Single services with prices, linking to their pages. */
export function ServicePriceList({ suburbName }: { suburbName?: string }) {
  return (
    <ul className="mt-5 divide-y divide-line border-y border-line">
      {SERVICE_PAGES.map((page) => {
        const { name, label } = servicePrice(page);
        return (
          <li key={page.slug} className="flex items-baseline justify-between gap-4 py-3">
            <Link href={`/services/${page.slug}`} className="font-semibold text-ink underline-offset-4 hover:underline">
              {suburbName ? `${page.heading} in ${suburbName}` : name}
            </Link>
            <span className="shrink-0 font-display text-lg text-harbour">{label}</span>
          </li>
        );
      })}
      <li className="flex items-baseline justify-between gap-4 py-3">
        <Link href="/gutter-guard" className="font-semibold text-ink underline-offset-4 hover:underline">
          {suburbName ? `Gutter guard in ${suburbName}` : "Gutter guard, fitted"}
        </Link>
        <span className="shrink-0 font-display text-lg text-harbour">
          from {formatPrice(GUTTER_GUARD.packages[0].price)}
        </span>
      </li>
    </ul>
  );
}

export function DoubleStoreyNote() {
  return (
    <p className="mt-4 text-sm text-ink-muted">
      <strong className="text-ink">Double-storey:</strong> +
      {formatPrice(DOUBLE_STOREY.washingAndWindows)} on washing and windows, +
      {formatPrice(DOUBLE_STOREY.gutterGuard)} on gutter guard.
    </p>
  );
}

export function PriceTableNote() {
  return <p className="mt-4 text-sm text-ink-muted">{PRICE_TABLE_NOTE}</p>;
}

export function GutterGuardTable() {
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-line bg-surface">
      <table className="w-full text-left">
        <caption className="sr-only">Gutter guard packages and prices</caption>
        <thead className="bg-concrete text-sm text-ink-muted">
          <tr>
            <th scope="col" className="px-4 py-2 font-semibold">Package</th>
            <th scope="col" className="px-4 py-2 font-semibold">Gutter length</th>
            <th scope="col" className="px-4 py-2 text-right font-semibold">Price</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {GUTTER_GUARD.packages.map((pkg) => (
            <tr key={pkg.id}>
              <th scope="row" className="px-4 py-3 font-semibold text-ink">{pkg.name}</th>
              <td className="px-4 py-3 text-ink-muted">{packageLength(pkg)}</td>
              <td className="px-4 py-3 text-right font-display text-lg text-harbour">
                {formatPrice(pkg.price)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Closing call to action. */
export function BookBand({
  title = `Book the ${HEADLINE_BUNDLE.name}, ${HEADLINE_PRICE}`,
  body = "Pick your day, pay the deposit, and we do the rest.",
  href = "/book",
  label = "Book your day",
}: {
  title?: string;
  body?: string;
  href?: string | { pathname: string; query: Record<string, string> };
  label?: string;
}) {
  return (
    <Section>
      <div className="rounded-xl bg-harbour px-6 py-8 text-white">
        <p className="display-caps text-3xl">{title}</p>
        <p className="mt-2 text-white/85">{body}</p>
        <div className="mt-5">
          <Link href={href} className={cta}>
            {label}
          </Link>
        </div>
      </div>
    </Section>
  );
}
