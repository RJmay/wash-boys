import {
  getBand,
  getService,
  isBanded,
  type PriceBand,
  type ServiceSlug,
} from "@/data/services";

/**
 * Reconciles what the customer says against what the satellite measured.
 *
 * These are two independent estimates with opposite weaknesses:
 *
 *  - the **measurement** is precise geometry off imagery that is routinely one
 *    to three years old. A slab poured last spring, an extension, a new
 *    carport or a re-done driveway simply is not in it;
 *  - the **customer's band** is current — they are looking at the property —
 *    but it is a guess, and people under-estimate area more often than they
 *    over-estimate it.
 *
 * So neither wins outright. Agreement is the signal worth acting on: when both
 * land in the same band we know enough to quote a firm price, and when they
 * disagree badly we should not be quoting instantly at all.
 *
 * Every disagreement is recorded. How often imagery is stale, in which
 * suburbs, and whether customers systematically under-call their driveways are
 * all things we can only learn from the deltas — and they feed the rate tuner
 * (SPEC §10).
 */

export type Agreement = "match" | "adjacent" | "distant" | "unknown";

export type Reconciliation = {
  slug: ServiceSlug;
  /** The band the customer picked. */
  customerBand: string;
  /** The band the measurement falls into, if any. */
  measuredBand: string | null;
  measured: number;
  /** Bands apart. Positive means the satellite measured bigger. */
  deltaBands: number;
  agreement: Agreement;
  /** Which side we price from, and why. */
  trust: "engine" | "customer" | "neither";
  reason: string;
};

function bandIndex(bands: readonly PriceBand[], id: string): number {
  return bands.findIndex((b) => b.id === id);
}

/** Which band a measured quantity falls into. */
function bandForQuantity(
  bands: readonly PriceBand[],
  qty: number,
): PriceBand | null {
  return (
    bands.find(
      (b) => qty >= b.unitLow && (b.unitHigh === null || qty < b.unitHigh),
    ) ?? null
  );
}

export function reconcile(
  slug: ServiceSlug,
  customerBandId: string,
  measured: number | undefined,
): Reconciliation | null {
  const service = getService(slug);
  if (!service || !isBanded(service)) return null;

  const bands = service.pricing.bands;
  const customerBand = getBand(service, customerBandId);
  if (!customerBand) return null;

  if (measured === undefined || !Number.isFinite(measured) || measured <= 0) {
    return {
      slug,
      customerBand: customerBandId,
      measuredBand: null,
      measured: 0,
      deltaBands: 0,
      agreement: "unknown",
      trust: "customer",
      reason: "nothing measured — the customer's size is all we have",
    };
  }

  const measuredBand = bandForQuantity(bands, measured);
  if (!measuredBand) {
    return {
      slug,
      customerBand: customerBandId,
      measuredBand: null,
      measured,
      deltaBands: 0,
      agreement: "unknown",
      trust: "customer",
      reason: "measurement fell outside every band",
    };
  }

  const delta =
    bandIndex(bands, measuredBand.id) - bandIndex(bands, customerBandId);
  const distance = Math.abs(delta);

  if (distance === 0) {
    return {
      slug,
      customerBand: customerBandId,
      measuredBand: measuredBand.id,
      measured,
      deltaBands: 0,
      agreement: "match",
      trust: "engine",
      reason: "measurement agrees with the size they picked",
    };
  }

  if (distance === 1) {
    /*
      One band out. If the satellite measured SMALLER than the customer says,
      the imagery is probably stale and they have added something since — they
      are standing in front of it, so take their word and price the larger of
      the two. If it measured LARGER, they may have under-called it or may only
      want part of it done, which is ambiguous enough to widen rather than
      guess.
    */
    const staleImagery = delta < 0;
    return {
      slug,
      customerBand: customerBandId,
      measuredBand: measuredBand.id,
      measured,
      deltaBands: delta,
      agreement: "adjacent",
      trust: staleImagery ? "customer" : "neither",
      reason: staleImagery
        ? "measured smaller than they say — imagery is likely out of date, so price on what they can see"
        : "measured larger than they say — widen the range rather than talk them up sight-unseen",
    };
  }

  return {
    slug,
    customerBand: customerBandId,
    measuredBand: measuredBand.id,
    measured,
    deltaBands: delta,
    agreement: "distant",
    trust: "neither",
    reason: `${distance} bands apart — too far out to quote instantly, confirm on site`,
  };
}

/**
 * How much to trust the whole quote once every line has been reconciled.
 * Multiplies the engine's own confidence, so both have to be happy.
 */
export function confidenceMultiplier(items: Reconciliation[]): number {
  if (items.length === 0) return 1;

  const worst = items.reduce((lowest, item) => {
    const score =
      item.agreement === "match"
        ? 1
        : item.agreement === "unknown"
          ? 0.85
          : item.agreement === "adjacent"
            ? 0.7
            : 0.3;
    return Math.min(lowest, score);
  }, 1);

  return worst;
}

/** True when any line is far enough out that a person should look at it. */
export function needsSiteVisit(items: Reconciliation[]): boolean {
  return items.some((item) => item.agreement === "distant");
}
