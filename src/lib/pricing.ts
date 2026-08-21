import { BUNDLE_MIN_SERVICES, BUSINESS } from "@/data/business";
import {
  getBand,
  getService,
  isBanded,
  serviceRange,
  type Service,
  type ServiceSlug,
} from "@/data/services";

/** A chosen service, plus its size band for the ones priced on size. */
export type ServiceSelection = {
  slug: ServiceSlug;
  /** Required for banded services (patios, fences) before the estimate firms up. */
  bandId?: string;
};

/** Callers may pass bare slugs where no size is involved. */
export type SelectionInput = string | ServiceSelection;

export type Estimate = {
  /** Low end of the range, after any bundle discount. */
  low: number;
  /** High end of the range, after any bundle discount. */
  high: number;
  /** Undiscounted totals, for the strike-through. */
  listLow: number;
  listHigh: number;
  /** True once 2+ services are selected (SPEC §5 step 1). */
  bundleApplied: boolean;
  bundleDiscountPct: number;
  /** Selected services whose size band is too big to price sight-unseen. */
  quotedOnSiteSlugs: ServiceSlug[];
  /** Banded services still waiting on a size - the range is a guess until then. */
  needsSizeSlugs: ServiceSlug[];
  /** True when there is a number worth rendering. */
  hasPricedServices: boolean;
  /** True while any size is unpicked: show the range as "from" rather than firm. */
  isProvisional: boolean;
};

function normalise(input: readonly SelectionInput[]): ServiceSelection[] {
  return input.map((item) =>
    typeof item === "string" ? { slug: item as ServiceSlug } : item,
  );
}

/** What one selected service contributes to the total. */
function contribution(service: Service, bandId: string | undefined) {
  if (service.pricing.kind === "unpriced") {
    return { low: 0, high: 0, quotedOnSite: false, needsSize: false };
  }

  if (!isBanded(service)) {
    const { low, high } = serviceRange(service);
    return { low, high, quotedOnSite: false, needsSize: false };
  }

  if (bandId === undefined) {
    // No size picked yet: show the full span so the customer sees a number,
    // and flag the estimate as provisional.
    const { low, high } = serviceRange(service);
    return { low, high, quotedOnSite: false, needsSize: true };
  }

  const band = getBand(service, bandId);
  if (!band) {
    const { low, high } = serviceRange(service);
    return { low, high, quotedOnSite: false, needsSize: true };
  }

  if (band.quoteOnly) {
    return { low: 0, high: 0, quotedOnSite: true, needsSize: false };
  }

  return {
    low: band.priceLow,
    high: band.priceHigh,
    quotedOnSite: false,
    needsSize: false,
  };
}

/**
 * Live estimate for the booking flow and the landing-page bundle nudge.
 *
 * Bundle rule: 2+ selected services take 15% off the total. A service being
 * quoted on site still counts towards the 2 but contributes no dollars - it
 * is listed separately so the range stays honest.
 */
export function estimateRange(input: readonly SelectionInput[]): Estimate {
  const selected = normalise(input)
    .map((sel) => ({ service: getService(sel.slug), bandId: sel.bandId }))
    .filter(
      (item): item is { service: Service; bandId: string | undefined } =>
        item.service !== undefined &&
        item.service.active &&
        item.service.bookable,
    );

  let listLow = 0;
  let listHigh = 0;
  let pricedCount = 0;
  const quotedOnSiteSlugs: ServiceSlug[] = [];
  const needsSizeSlugs: ServiceSlug[] = [];

  for (const { service, bandId } of selected) {
    const c = contribution(service, bandId);
    listLow += c.low;
    listHigh += c.high;
    if (c.low > 0 || c.high > 0) pricedCount += 1;
    if (c.quotedOnSite) quotedOnSiteSlugs.push(service.slug);
    if (c.needsSize) needsSizeSlugs.push(service.slug);
  }

  const bundleApplied = selected.length >= BUNDLE_MIN_SERVICES;
  const multiplier = bundleApplied ? 1 - BUSINESS.bundleDiscountPct / 100 : 1;

  return {
    low: Math.round(listLow * multiplier),
    high: Math.round(listHigh * multiplier),
    listLow,
    listHigh,
    bundleApplied,
    bundleDiscountPct: BUSINESS.bundleDiscountPct,
    quotedOnSiteSlugs,
    needsSizeSlugs,
    hasPricedServices: pricedCount > 0,
    isProvisional: needsSizeSlugs.length > 0,
  };
}

/** Whole dollars, no cents - prices are always ranges, never exact. */
export function formatPrice(amount: number): string {
  return `$${amount.toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;
}

/** "$270-600" - one dollar sign, en dash. */
export function formatRange(low: number, high: number): string {
  if (low === high) return formatPrice(low);
  const top = high.toLocaleString("en-AU", { maximumFractionDigits: 0 });
  return `${formatPrice(low)}–${top}`;
}
