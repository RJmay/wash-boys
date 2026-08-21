import Link from "next/link";

import { BUSINESS } from "@/data/business";
import {
  BOOKABLE_SERVICES,
  COMING_SOON_SERVICES,
  isBanded,
  serviceFromPrice,
  type Service,
} from "@/data/services";
import { formatPrice } from "@/lib/pricing";
import { card, Section, SectionHeading } from "./ui";

/** "priced on area" / "priced by the metre" - how the number is arrived at. */
function pricingBasis(service: Service): string | null {
  if (!isBanded(service)) return null;
  return service.pricing.unit === "m2"
    ? "priced on the area"
    : "priced by the metre, per side";
}

function ServiceCard({ service }: { service: Service }) {
  const from = serviceFromPrice(service);
  const basis = pricingBasis(service);

  return (
    <li className={`${card} flex flex-col gap-3`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-ink">{service.name}</h3>
        <p className="shrink-0 text-right">
          <span className="block text-xs text-ink-muted">from</span>
          <span className="font-display text-price text-harbour">
            {formatPrice(from)}
          </span>
        </p>
      </div>

      <p className="text-sm text-ink-muted">{service.blurb}</p>

      {basis ? (
        <p className="text-xs text-ink-muted">{basis}</p>
      ) : null}

      <Link
        href={{ pathname: "/book", query: { services: service.slug } }}
        className="mt-auto inline-flex w-fit items-center gap-1 font-semibold text-harbour underline underline-offset-4"
      >
        Add to booking
        <span aria-hidden="true">→</span>
      </Link>
    </li>
  );
}

/**
 * The coming-soon card (SPEC §4.3). Greyed, never selectable, and it goes to
 * the waitlist rather than the booking flow. A plain anchor, so it works with
 * JavaScript disabled.
 */
function ComingSoonCard({ service }: { service: Service }) {
  return (
    <li
      className={`${card} flex flex-col gap-3 border-dashed bg-surface/60`}
      aria-label={`${service.name} — not available yet`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-ink-muted">{service.name}</h3>
        <span className="shrink-0 rounded-full bg-harbour/10 px-3 py-1 text-xs font-semibold tracking-wide text-harbour uppercase">
          Coming soon
        </span>
      </div>

      <p className="text-sm text-ink-muted">
        We are getting set up for gutters ahead of storm season. No price and no
        booking until we are properly equipped for it.
      </p>

      <Link
        href="/#gutter-waitlist"
        className="mt-auto inline-flex w-fit items-center gap-1 font-semibold text-harbour underline underline-offset-4"
      >
        Join the waitlist
        <span aria-hidden="true">→</span>
      </Link>
    </li>
  );
}

export function ServicesGrid() {
  return (
    <Section id="services" labelledBy="services-heading">
      <SectionHeading id="services-heading">What we clean</SectionHeading>

      <p className="mt-3 text-ink-muted">
        Prices are ranges, not quotes. {BUSINESS.pricingDisclaimer}
      </p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {BOOKABLE_SERVICES.map((service) => (
          <ServiceCard key={service.slug} service={service} />
        ))}
        {COMING_SOON_SERVICES.map((service) => (
          <ComingSoonCard key={service.slug} service={service} />
        ))}
      </ul>
    </Section>
  );
}
