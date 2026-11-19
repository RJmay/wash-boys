import Link from "next/link";
import type { ReactNode } from "react";

import {
  GUTTER_GUARD_TEASER,
  HEADLINE_PRICE,
  HOW_IT_WORKS_SHORT,
  PRICE_TABLE_NOTE,
  REFRESH_INCLUDES,
  WHY_US,
} from "@/data/copy";
import { FAQ } from "@/data/faq";
import { isShown } from "@/data/placeholders";
import {
  BUNDLES,
  DEPOSITS,
  DOUBLE_STOREY,
  DRIVEWAY_OPTIONS,
  drivewayDetail,
  drivewayExtra,
  formatPrice,
  getPricedService,
  GUTTER_GUARD,
  GUTTER_GUARD_FROM,
  HEADLINE_BUNDLE,
  itemName,
  packageLength,
  servicePriceLabel,
  SERVICES_PRICED,
  type Bundle,
} from "@/data/pricing";
import { SERVICE_PAGES, servicePrice } from "@/data/services";
import { pairsFor, PHOTO_SLOTS, reviews, type PhotoService } from "@/data/site";
import { PRIORITY_SUBURBS, type Suburb } from "@/data/suburbs";
import { BeforeAfterSlider } from "./before-after";
import { CallbackForm } from "./callback-form";
import { ContactLinks } from "./tracking";
import {
  Arrow,
  card,
  chip,
  container,
  cta,
  ctaOnDark,
  Placeholder,
  Section,
  SectionHeader,
  textLink,
  TickList,
  type Tone,
} from "./ui";

type Href = string | { pathname: string; query: Record<string, string> };

// ── Hero ──────────────────────────────────────────────────────────────────

/**
 * Above-the-fold hero for the home page and every suburb page.
 *
 * The brief's hard requirement: the bundle price and a Book button are
 * visible without scrolling on a phone. So the left column is text only, the
 * headline is short, and the price and button sit directly under it. The
 * offer card is text too; on a phone it stacks below the button, on a desktop
 * it fills the right-hand column so the whole offer reads in one glance.
 */
export function Hero({
  eyebrow,
  heading,
  children,
  bookHref = "/book",
  secondary = { href: "/pricing", label: "See all prices" },
  headingClassName = "text-hero",
  after,
  aside = <OfferCard />,
}: {
  eyebrow?: string;
  heading: string;
  children: ReactNode;
  bookHref?: Href;
  secondary?: { href: string; label: string };
  headingClassName?: string;
  /** A line under the buttons, so it never pushes them down the screen. */
  after?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="on-dark bg-harbour text-white">
      <div
        className={`${container} grid gap-10 pt-6 pb-12 sm:pt-12 sm:pb-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] lg:items-center lg:gap-16 lg:py-20`}
      >
        <div className="flex max-w-2xl flex-col gap-4">
          {eyebrow ? <p className="eyebrow text-white/70">{eyebrow}</p> : null}
          <h1 className={`display-caps text-balance ${headingClassName}`}>{heading}</h1>
          {children}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
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
          {after}
        </div>
        {aside}
      </div>
    </section>
  );
}

/** "Only need the gutters done? Gutter clean $190 →", for the hero. */
export function JustGuttersLine() {
  const gutters = getPricedService("gutter-clean");
  if (!gutters) return null;
  return (
    <p className="text-white/85">
      Only need the gutters done?{" "}
      <Link
        href="/book?package=single&services=gutter-clean"
        className="font-semibold text-white underline underline-offset-4"
      >
        {gutters.name} {servicePriceLabel(gutters)}
        <span aria-hidden="true">&nbsp;→</span>
      </Link>
    </p>
  );
}

export function PriceTag({ amount }: { amount: number }) {
  return <strong className="font-display text-price text-hivis">{formatPrice(amount)}</strong>;
}

/** What's in the headline bundle, as a card. Sits in the hero's right column. */
export function OfferCard() {
  const bundle = HEADLINE_BUNDLE;
  return (
    <div className="rounded-2xl bg-surface p-6 text-ink shadow-[0_24px_48px_-24px_rgba(0,0,0,0.5)] sm:p-8">
      <p className="eyebrow text-harbour">What&apos;s included</p>
      <h2 className="display-caps mt-2 text-3xl text-harbour">The {bundle.name}</h2>
      <TickList items={REFRESH_INCLUDES} className="mt-5" />
      <div className="mt-6 flex items-end justify-between gap-4 border-t border-line pt-5">
        <p className="text-sm text-ink-muted">
          {bundle.separatePrice ? (
            <>
              Bought separately{" "}
              <s className="font-semibold">{formatPrice(bundle.separatePrice)}</s>
            </>
          ) : null}
          {bundle.saving ? (
            <span className="mt-1 block font-semibold text-ink">
              You save {formatPrice(bundle.saving)}
            </span>
          ) : null}
        </p>
        <p className="font-display text-5xl leading-none text-harbour">{formatPrice(bundle.price)}</p>
      </div>
    </div>
  );
}

// ── Proof ─────────────────────────────────────────────────────────────────

/**
 * Real before-and-afters, one per service. A service without a real pair is
 * simply left out, in every build; with none left the whole section goes.
 * Add pairs in src/data/site.ts.
 *
 * An odd number of photos would leave a hole in the grid, so the last cell
 * becomes the booking prompt instead.
 */
export function RecentWork({
  services = ["house-wash", "driveway", "gutter-clean", "fences"],
  tone = "grey",
}: {
  services?: PhotoService[];
  tone?: Tone;
}) {
  const slots = PHOTO_SLOTS.filter(
    (s) => services.includes(s.service) && pairsFor(s.service).length > 0,
  );
  if (slots.length === 0) return null;
  return (
    <Section labelledBy="work-heading" tone={tone}>
      <SectionHeader
        id="work-heading"
        eyebrow="Recent work"
        title="Real jobs, real results"
        lead="Our own work, not stock photos. Drag the handle to compare."
      />
      <ul className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2">
        {slots.map((slot) => (
          <li key={slot.service}>
            <BeforeAfterSlider pair={pairsFor(slot.service)[0]} title={slot.label} />
          </li>
        ))}
        {slots.length % 2 === 1 ? (
          <li className="hidden sm:block">
            <Link
              href="/book"
              className="on-dark flex aspect-4/3 flex-col justify-end rounded-xl bg-harbour p-7 text-white transition hover:bg-harbour-deep"
            >
              <span className="display-caps text-section">Your place next</span>
              <span className="mt-3 text-lg text-white/85">
                The {HEADLINE_BUNDLE.name}, {HEADLINE_PRICE}. Pick a day we&apos;re in your street.
              </span>
              <span className="mt-5 font-semibold underline underline-offset-4">
                Book your day <Arrow />
              </span>
            </Link>
          </li>
        ) : null}
      </ul>
    </Section>
  );
}

/**
 * One service's before-and-afters beside a short explanation. Used on the
 * service and gutter guard pages. Left out entirely until a real pair exists.
 */
export function ServiceWork({
  service,
  name,
  tone = "grey",
  children,
}: {
  service: PhotoService;
  name: string;
  tone?: Tone;
  children?: ReactNode;
}) {
  const pairs = pairsFor(service);
  if (pairs.length === 0) return null;
  return (
    <Section labelledBy="work-heading" tone={tone}>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-center lg:gap-16">
        <div>
          <SectionHeader
            id="work-heading"
            eyebrow="Recent work"
            title="Before and after"
            lead={`${name}${pairs[0].suburb ? ` in ${pairs[0].suburb}` : ""}. Our own work, not a stock photo. Drag the handle to compare.`}
          />
          {children}
        </div>
        <div className={`grid gap-8 ${pairs.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {pairs.map((pair) => (
            <BeforeAfterSlider
              key={pair.alt}
              pair={pair}
              sizes={pairs.length > 1 ? "(min-width: 640px) 50vw, 100vw" : "(min-width: 1024px) 720px, 100vw"}
            />
          ))}
        </div>
      </div>
    </Section>
  );
}

// ── How it works and why us ───────────────────────────────────────────────

export function HowItWorksSteps({
  steps = HOW_IT_WORKS_SHORT,
  tone = "white",
  title = "How it works",
  eyebrow = "Four steps",
}: {
  steps?: readonly { title: string; body: string }[];
  tone?: Tone;
  title?: string;
  eyebrow?: string;
}) {
  return (
    <Section labelledBy="how-heading" tone={tone}>
      <SectionHeader id="how-heading" eyebrow={eyebrow} title={title} />
      <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-4 lg:flex-col">
            <span
              aria-hidden="true"
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-harbour font-display text-xl text-white"
            >
              {index + 1}
            </span>
            <p className="text-ink lg:border-t lg:border-line lg:pt-4">
              <strong className="block text-lg">{step.title}</strong>
              <span className="text-ink-muted">{step.body}</span>
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/** Why book us: the brief's positioning, plus real reviews once there are any. */
export function WhyUs({ tone = "grey" }: { tone?: Tone }) {
  return (
    <Section labelledBy="why-heading" tone={tone}>
      <SectionHeader id="why-heading" eyebrow="Why book us" title="Two locals, one day, one price" />
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {WHY_US.map((point) => (
          <li key={point.title} className={card}>
            <p className="font-semibold text-ink">{point.title}</p>
            <p className="mt-2 text-ink-muted">{point.body}</p>
          </li>
        ))}
      </ul>
      {reviews.length > 0 ? (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
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

// ── Prices ────────────────────────────────────────────────────────────────

const priceRow =
  "flex items-baseline justify-between gap-4 py-4 font-semibold text-ink transition hover:text-harbour";

/**
 * Single services, each one tap from a prefilled booking. The home page sells
 * the bundle hard, so without this a visitor who only wants their gutters
 * cleaned never sees a price under the bundle and leaves.
 */
export function SingleServices({ tone = "white" }: { tone?: Tone }) {
  return (
    <Section labelledBy="single-heading" tone={tone}>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-16">
        <div>
          <SectionHeader
            id="single-heading"
            eyebrow="Single services"
            title="Just need one thing?"
            lead="Book any service on its own. Single-storey prices, GST included."
          />
          <DoubleStoreyNote />
          <p className="mt-6">
            <Link href="/pricing" className={textLink}>
              Bundles and all prices <Arrow />
            </Link>
          </p>
        </div>
        <ul className="divide-y divide-line border-y border-line">
          {SERVICES_PRICED.map((service) => (
            <li key={service.id}>
              <Link href={`/book?package=single&services=${service.id}`} className={priceRow}>
                <span>
                  {service.name}{" "}
                  <span className="font-normal text-ink-muted">
                    <Arrow />
                  </span>
                </span>
                <span className="shrink-0 font-display text-xl text-harbour">
                  {servicePriceLabel(service)}
                </span>
              </Link>
            </li>
          ))}
          <li>
            <Link href="/gutter-guard" className={priceRow}>
              <span>
                Gutter guard, fitted{" "}
                <span className="font-normal text-ink-muted">
                  <Arrow />
                </span>
              </span>
              <span className="shrink-0 font-display text-xl text-harbour">
                from {formatPrice(GUTTER_GUARD_FROM)}
              </span>
            </Link>
          </li>
        </ul>
      </div>
    </Section>
  );
}

/** Gutter guard as its own band, with the real before-and-after beside it. */
export function GutterGuardFeature() {
  const pair = pairsFor("gutter-guard")[0];
  return (
    <Section labelledBy="gg-heading" tone="dark">
      <div className={`grid gap-10 lg:items-center lg:gap-16 ${pair ? "lg:grid-cols-2" : ""}`}>
        <div className="max-w-xl">
          <SectionHeader id="gg-heading" eyebrow="Gutter guard" title="Never clean your gutters again" onDark />
          <p className="mt-4 text-lg text-white/85">{GUTTER_GUARD_TEASER}</p>
          <p className="mt-6 font-display text-price text-hivis">
            from {formatPrice(GUTTER_GUARD_FROM)}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link href="/gutter-guard" className={ctaOnDark}>
              Gutter guard prices
            </Link>
            <Link
              href="/book?package=gutter-guard"
              className="font-semibold text-white underline underline-offset-4"
            >
              Book gutter guard <Arrow />
            </Link>
          </div>
        </div>
        {pair ? <BeforeAfterSlider pair={pair} title="Gutter guard" tone="dark" /> : null}
      </div>
    </Section>
  );
}

export function WhereWeWork({ tone = "white" }: { tone?: Tone }) {
  const names = PRIORITY_SUBURBS.slice(0, 6).map((s) => s.name);
  return (
    <Section id="area" labelledBy="area-heading" tone={tone}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-center lg:gap-16">
        <div>
          <SectionHeader
            id="area-heading"
            eyebrow="Where we work"
            title="Booking these suburbs now"
            lead={`${names.slice(0, -1).join(", ")} and ${names.at(-1)}, and nearby.`}
          />
          <p className="mt-6">
            <Link href="/areas" className={textLink}>
              Every suburb we cover <Arrow />
            </Link>
          </p>
        </div>
        <SuburbGrid />
      </div>
    </Section>
  );
}

/** Priority suburbs as a grid of tappable cards. */
export function SuburbGrid({ suburbs = PRIORITY_SUBURBS }: { suburbs?: readonly Suburb[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
      {suburbs.map((s) => (
        <li key={s.slug}>
          <Link
            href={`/areas/${s.slug}`}
            className="flex h-full items-center justify-between gap-2 rounded-lg border border-line bg-surface px-4 py-3 font-semibold text-ink transition hover:border-harbour hover:text-harbour"
          >
            <span>
              {s.name}{" "}
              <span className="block text-sm font-normal text-ink-muted">{s.postcode}</span>
            </span>
            <span aria-hidden="true" className="text-ink-muted">
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Suburb chips with a search-phrase prefix, e.g. "gutter cleaning Buderim". */
export function NearYou({
  title,
  prefix,
  suburbs = PRIORITY_SUBURBS,
  tone = "white",
}: {
  title: string;
  prefix?: string;
  suburbs?: readonly Suburb[];
  tone?: Tone;
}) {
  return (
    <Section labelledBy="near-heading" tone={tone}>
      <SectionHeader
        id="near-heading"
        eyebrow="Service areas"
        title={title}
        action={
          <Link href="/areas" className={textLink}>
            All suburbs <Arrow />
          </Link>
        }
      />
      <ul className="mt-8 flex flex-wrap gap-2">
        {suburbs.map((s) => (
          <li key={s.slug}>
            <Link href={`/areas/${s.slug}`} className={chip}>
              {prefix ? `${prefix} ${s.name}` : s.name}
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function FaqList({
  standalone = false,
  limit,
  tone = "white",
}: {
  /** On /faq the page header carries the heading, so the list stands alone. */
  standalone?: boolean;
  /** Show only the first few, with a link to the rest. */
  limit?: number;
  tone?: Tone;
}) {
  const answered = FAQ.filter((item) => isShown(item.a));
  const items = limit ? answered.slice(0, limit) : answered;
  const list = (
    <div className="divide-y divide-line border-y border-line">
      {items.map((item) => (
        <details key={item.q} className="group py-1">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-semibold text-ink marker:hidden">
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
          <p className="max-w-prose pb-5 text-ink-muted">
            <Placeholder value={item.a} />
          </p>
        </details>
      ))}
    </div>
  );

  if (standalone) {
    return (
      <Section tone={tone}>
        <div className="mx-auto max-w-3xl">{list}</div>
      </Section>
    );
  }

  return (
    <Section id="faq" labelledBy="faq-heading" tone={tone}>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
        <div>
          <SectionHeader id="faq-heading" eyebrow="Before you book" title="Questions" />
          {limit && answered.length > limit ? (
            <p className="mt-6">
              <Link href="/faq" className={textLink}>
                All questions <Arrow />
              </Link>
            </p>
          ) : null}
        </div>
        {list}
      </div>
    </Section>
  );
}

// ── Pricing blocks ────────────────────────────────────────────────────────

export function BundleCard({ bundle }: { bundle: Bundle }) {
  const bookable = bundle.id !== "annual-refresh";
  return (
    <li
      className={`${card} flex flex-col ${bundle.headline ? "border-2 border-harbour" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <h3 className="text-xl font-semibold text-ink">{bundle.name}</h3>
        {bundle.saving ? (
          <span className="shrink-0 rounded-full bg-harbour/10 px-3 py-1 text-sm font-semibold text-harbour">
            Save {formatPrice(bundle.saving)}
          </span>
        ) : null}
      </div>
      <p className="mt-3 font-display text-5xl leading-none text-harbour">
        {formatPrice(bundle.price)}
        {bundle.billing ? <span className="ml-1 font-sans text-base text-ink-muted"> a year</span> : null}
      </p>
      {bundle.separatePrice ? (
        <p className="mt-2 text-sm text-ink-muted">
          Bought separately {formatPrice(bundle.separatePrice)}
        </p>
      ) : null}
      <TickList
        items={bundle.includes.map(itemName)}
        className="mt-5 border-t border-line pt-5 text-ink"
      />
      {bundle.id === "annual-refresh" ? (
        <p className="mt-4 text-sm text-ink-muted">
          The {HEADLINE_BUNDLE.name} again every October, before storm season. Offered after your
          first job.
        </p>
      ) : null}
      {bookable ? (
        <div className="mt-auto pt-6">
          <Link href={`/book?package=${bundle.id}`} className={textLink}>
            Book the {bundle.name} <Arrow />
          </Link>
        </div>
      ) : null}
    </li>
  );
}

export function BundleCards({
  ids,
  className = "mt-10",
}: {
  ids?: Bundle["id"][];
  className?: string;
}) {
  const list = BUNDLES.filter((b) => !ids || ids.includes(b.id));
  const cols = list.length >= 3 ? "lg:grid-cols-3" : "";
  return (
    <ul className={`grid gap-5 md:grid-cols-2 ${cols} ${className}`}>
      {list.map((bundle) => (
        <BundleCard key={bundle.id} bundle={bundle} />
      ))}
    </ul>
  );
}

/** Single services with prices, linking to their pages. */
export function ServicePriceList({ suburbName }: { suburbName?: string }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {SERVICE_PAGES.map((page) => {
        const { name, label } = servicePrice(page);
        return (
          <li key={page.slug}>
            <Link href={`/services/${page.slug}`} className={priceRow}>
              <span>
                {suburbName ? `${page.heading} in ${suburbName}` : name}{" "}
                <span className="font-normal text-ink-muted">
                  <Arrow />
                </span>
              </span>
              <span className="shrink-0 font-display text-xl text-harbour">{label}</span>
            </Link>
          </li>
        );
      })}
      <li>
        <Link href="/gutter-guard" className={priceRow}>
          <span>
            {suburbName ? `Gutter guard in ${suburbName}` : "Gutter guard, fitted"}{" "}
            <span className="font-normal text-ink-muted">
              <Arrow />
            </span>
          </span>
          <span className="shrink-0 font-display text-xl text-harbour">
            from {formatPrice(GUTTER_GUARD.packages[0].price)}
          </span>
        </Link>
      </li>
    </ul>
  );
}

export function DoubleStoreyNote({ className = "mt-4" }: { className?: string }) {
  return (
    <p className={`text-sm text-ink-muted ${className}`}>
      <strong className="text-ink">Double-storey:</strong> +
      {formatPrice(DOUBLE_STOREY.washingAndWindows)} on washing and windows, +
      {formatPrice(DOUBLE_STOREY.gutterGuard)} on gutter guard.
    </p>
  );
}

export function PriceTableNote({ className = "mt-4" }: { className?: string }) {
  return <p className={`text-sm text-ink-muted ${className}`}>{PRICE_TABLE_NOTE}</p>;
}

export function GutterGuardTable() {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <table className="w-full text-left">
        <caption className="sr-only">Gutter guard packages and prices</caption>
        <thead className="bg-concrete text-sm text-ink-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold sm:px-5">Package</th>
            <th scope="col" className="px-4 py-3 font-semibold sm:px-5">Gutter length</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold sm:px-5">Price</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {GUTTER_GUARD.packages.map((pkg) => (
            <tr key={pkg.id}>
              <th scope="row" className="px-4 py-4 font-semibold text-ink sm:px-5">{pkg.name}</th>
              <td className="px-4 py-4 text-ink-muted sm:px-5">{packageLength(pkg)}</td>
              <td className="px-4 py-4 text-right font-display text-xl text-harbour sm:px-5">
                {formatPrice(pkg.price)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Driveway sizes: the price on its own, and what each size adds to a bundle. */
export function DrivewayTable() {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <table className="w-full text-left">
        <caption className="sr-only">Driveway sizes and prices</caption>
        <thead className="bg-concrete text-sm text-ink-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold sm:px-5">Driveway</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold sm:px-5">On its own</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold sm:px-5">In a bundle</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {DRIVEWAY_OPTIONS.map((option) => {
            const extra = drivewayExtra(option);
            return (
              <tr key={option.id}>
                <th scope="row" className="px-4 py-4 font-semibold text-ink sm:px-5">
                  {option.name}
                  <span className="block text-sm font-normal text-ink-muted">
                    {drivewayDetail(option)}
                  </span>
                </th>
                <td className="px-4 py-4 text-right font-display text-xl text-harbour sm:px-5">
                  {formatPrice(option.price)}
                </td>
                <td className="px-4 py-4 text-right text-ink-muted sm:px-5">
                  {extra ? `+${formatPrice(extra)}` : "Included"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Closing ───────────────────────────────────────────────────────────────

/** The usual last doubts before booking, answered from the FAQ. */
const CLOSING_POINTS = [
  "No quote visit, no call-out fee",
  "You don't need to be home",
  "If it rains, we move you to the next available day at no cost",
];

/**
 * The end of every page: book, or talk first. Side by side on a desktop,
 * stacked on a phone, so the last screen always offers both and nothing else.
 *
 * Booking a day and paying a deposit to a business you met on a flyer is a
 * big first step; the callback form is the small one.
 */
export function Closing({
  title = `Book the ${HEADLINE_BUNDLE.name}, ${HEADLINE_PRICE}`,
  body = "Pick your day, pay the deposit, and we do the rest.",
  href = "/book",
  label = "Book your day",
  tone = "grey",
}: {
  title?: string;
  body?: string;
  href?: Href;
  label?: string;
  tone?: Tone;
}) {
  return (
    <Section tone={tone}>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="on-dark flex flex-col rounded-2xl bg-harbour p-7 text-white sm:p-10">
          <p className="eyebrow text-white/70">Ready when you are</p>
          <h2 className="display-caps mt-3 text-section text-balance">{title}</h2>
          <p className="mt-4 text-lg text-white/85">{body}</p>
          <TickList items={CLOSING_POINTS} onDark className="mt-6 text-white/85" />
          <div className="mt-8 lg:mt-auto lg:pt-8">
            <Link href={href} className={cta}>
              {label}
            </Link>
            <p className="mt-4 text-sm text-white/75">
              A {formatPrice(DEPOSITS.cleaning)} deposit by bank transfer holds your day (
              {formatPrice(DEPOSITS.gutterGuard)} with gutter guard). Nothing is paid on the
              website.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-7 sm:p-10">
          <p className="eyebrow text-harbour">Not ready to book?</p>
          <h2 className="display-caps mt-3 text-section text-harbour">Rather talk first?</h2>
          <p className="mt-4 text-lg text-ink">
            <ContactLinks />
          </p>
          <p className="mt-1 text-ink-muted">Or leave your number and we&apos;ll call you back.</p>
          <CallbackForm />
        </div>
      </div>
    </Section>
  );
}
