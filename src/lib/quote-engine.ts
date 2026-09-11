import "server-only";

import {
  getBand,
  getService,
  isBanded,
  type ServiceSlug,
} from "@/data/services";
import {
  confidenceMultiplier,
  needsSiteVisit,
  reconcile,
  type Reconciliation,
} from "./quote-reconcile";
import { quoteEngineUrl } from "./env";
import { estimateRange, type Estimate, type ServiceSelection } from "./pricing";

/**
 * Phase-2 instant quote (SPEC §10).
 *
 * Slots between booking steps 2 and 3: if the engine answers confidently we
 * show a real price, otherwise the customer never knows it was asked and gets
 * today's range flow. Everything here is inert until QUOTE_ENGINE_URL is set,
 * which is deliberate - SPEC §10 gates switching this on behind 30-50 logged
 * jobs and a backtest within 10-15% of final_price.
 *
 * Two safety properties matter more than the feature:
 *
 *  1. Only our four bookable services are ever sent. The engine also sells
 *     roof washes, solar panels, sealing and gutter work; none of that is
 *     offered here, and a gutter price must never surface (CLAUDE.md).
 *  2. Any failure - timeout, bad payload, low confidence - falls back to the
 *     band estimate. A booking must never be blocked by the quote engine.
 */

/** Wash Boys slug -> the engine's job id. Only these four ever cross. */
const JOB_IDS: Record<ServiceSlug, string | null> = {
  "driveway-cleaning": "driveway_wash",
  "house-washing": "house_wash",
  "patio-cleaning": "patio_wash",
  "fence-cleaning": "fence_wash",
  // Never sent. Not offered, and the engine would happily price it.
  "gutter-cleaning": null,
};

/** The engine's surface key for each of our services, and its unit. */
const SURFACE_KEYS: Record<string, string> = {
  driveway_wash: "driveway_exposed_sqm",
  house_wash: "house_wall_sqm",
  patio_wash: "patio_sqm",
  fence_wash: "fence_lin_m",
};

/**
 * Below this we do not trust the engine enough to quote a firm price, and
 * fall back to the range. SPEC §10 leaves the threshold to us; start strict.
 */
export const CONFIDENCE_THRESHOLD = 0.75;

/**
 * A cold /quick-quote takes 40-50s: a geocode, an aerial fetch, a vision call
 * and a pricing call, two of them round trips to Claude. This budget is 6s,
 * so a first-time address can only ever time out and fall back.
 *
 * That is the right default. Nobody standing at a letterbox waits 50s inside a
 * flow that promises a booking in 60, and the range estimate is already a good
 * answer. But it does mean the instant quote cannot work the way it is wired:
 * the engine caches a result for 24h, so making this useful means asking it
 * early - when the customer types their address in step 1 - and reading the
 * cached answer at the quote step. That is a booking-flow change, not a number
 * to raise here. Do not simply widen this: it converts a fast fallback into a
 * long stall.
 *
 * Note the engine only caches when it genuinely measured the property; a
 * suburb-average fallback is deliberately not cached, so pre-warming does
 * nothing while the imagery service is down.
 */
const TIMEOUT_MS = 6000;

export type QuoteLineItem = {
  slug: ServiceSlug;
  measured: number;
  low: number;
  high: number;
};

export type InstantQuote = {
  kind: "instant";
  lineItems: QuoteLineItem[];
  low: number;
  high: number;
  /** Engine confidence after reconciling against what the customer told us. */
  confidence: number;
  /** What the engine reported before reconciliation, for the record. */
  rawConfidence: number;
  measurements: Record<string, unknown>;
  /** Per-service comparison of measured area against the size they picked. */
  reconciliation: Reconciliation[];
  /** True when a line is far enough out that someone should look at it. */
  siteVisit: boolean;
};

export type QuoteOutcome =
  | InstantQuote
  | { kind: "fallback"; reason: string; estimate: Estimate };

/**
 * The customer picked a size band, not a measurement. The band midpoint is the
 * honest translation - it is what the band is centred on, and the engine
 * refines it from satellite data anyway when it can.
 */
function quantityForSelection(selection: ServiceSelection): number | null {
  const service = getService(selection.slug);
  if (!service || !isBanded(service) || !selection.bandId) return null;

  const band = getBand(service, selection.bandId);
  if (!band || band.quoteOnly) return null;

  return band.unitHigh === null
    ? band.unitLow
    : (band.unitLow + band.unitHigh) / 2;
}

/**
 * The engine's actual response shape, verified against a live /quick-quote in
 * Sept 2026. This file previously described a different one - total_low,
 * total_high, a numeric confidence, line items keyed by slug - and none of
 * those fields exist. Nothing caught it because the integration has never been
 * switched on: every field read back undefined and the call fell through to the
 * range estimate, which looks exactly like the engine being unavailable.
 */
type EngineResponse = {
  /** False when the property is too big to price from the air. */
  instant_quote?: boolean;
  reason?: string;
  line_items?: { job_id?: string; job_name?: string; min?: number; max?: number }[];
  total_min?: number;
  total_max?: number;
  /** A word, not a number. */
  confidence?: string;
  /**
   * "maps_vision" when the areas were measured off imagery, "manual" when the
   * engine fell back to suburb averages because it could not see the property.
   */
  area_source?: string;
  /** Where the measurements live - the line items carry none. */
  measurements?: Record<string, unknown>;
};

/**
 * The engine reports confidence as a word. These are the numbers those words
 * have to become to be compared against CONFIDENCE_THRESHOLD.
 *
 * "medium" is the engine's ordinary good case - a clean image with a cadastre
 * boundary returns it - so it sits just above the threshold on its own and
 * drops below as soon as reconciliation finds any disagreement. "high" is what
 * carries a quote that includes a surface we cannot measure.
 *
 * These are a starting calibration, not a measured one. SPEC §10's backtest
 * over 30-50 real jobs is what should set them.
 */
const CONFIDENCE_WORDS: Record<string, number> = {
  high: 0.95,
  medium: 0.8,
  low: 0.4,
};

/**
 * Ask the engine for a price. Returns a fallback outcome rather than throwing:
 * callers render whatever comes back.
 */
export async function getInstantQuote(
  address: string,
  selections: readonly ServiceSelection[],
): Promise<QuoteOutcome> {
  const estimate = estimateRange(selections);
  const fallback = (reason: string): QuoteOutcome => ({
    kind: "fallback",
    reason,
    estimate,
  });

  const baseUrl = quoteEngineUrl();
  if (!baseUrl) return fallback("quote engine not configured");

  const jobIds: string[] = [];
  const sentSlugs: ServiceSlug[] = [];

  for (const selection of selections) {
    const jobId = JOB_IDS[selection.slug];
    if (!jobId) continue;

    // A quote-only band has no quantity to reconcile against, and the engine
    // would price it anyway. Those belong in the range flow.
    if (quantityForSelection(selection) === null) continue;

    jobIds.push(jobId);
    sentSlugs.push(selection.slug);
  }

  if (jobIds.length === 0) return fallback("nothing priceable to send");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    /*
      /quick-quote, not /quote. /quote prices the numbers you hand it and
      measures nothing, so sending the customer's own band midpoints there and
      then "reconciling" the answer compares their guess against itself and
      always agrees. /quick-quote runs the aerial measurement, which is the
      only thing that makes reconciliation mean anything.

      It takes the address and the job ids, nothing else. What the customer
      told us is not sent at all now: it is held back and used to judge the
      answer.
    */
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/quick-quote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address, job_ids: jobIds }),
      signal: controller.signal,
    });

    if (!response.ok) return fallback(`engine returned ${response.status}`);

    const data = (await response.json()) as EngineResponse;

    // The engine refuses to price anything off the residential scale - a big
    // lot, acreage, a body corporate. It says so rather than guessing, and the
    // range flow is the right answer for those.
    if (data.instant_quote === false) {
      return fallback(data.reason ?? "engine declined to quote this property");
    }

    /*
      No measurement, no instant quote.

      When the engine cannot see the property - the imagery service throttles
      and returns blank tiles, or the address falls outside its coverage - it
      falls back to suburb averages and keeps answering, still reporting
      "medium" confidence on the pricing. Those numbers are a guess dressed as
      a measurement, and our own range flow is a better guess because the
      customer picked the band themselves.
    */
    if (data.area_source !== "maps_vision") {
      return fallback(`engine could not measure the property (${data.area_source ?? "unknown source"})`);
    }

    const rawConfidence = CONFIDENCE_WORDS[data.confidence ?? ""] ?? 0;

    /*
      Cross-check the measurement against what the customer said. Satellite
      imagery runs one to three years behind, so a new slab or an extension is
      invisible to it; the customer is looking at the actual property. Neither
      is authoritative on its own, so agreement is what earns a firm price.

      Measurements come from the top-level block, not the line items - the
      engine's line items carry prices and prose, no areas. It only measures
      flatwork and roof, so a house wash, patio or fence reconciles as
      "unknown" and costs confidence rather than inventing an area for it.
    */
    const measured = data.measurements ?? {};
    const reconciliation = selections
      .map((sel) => {
        const jobId = JOB_IDS[sel.slug];
        if (!jobId || !sel.bandId) return null;
        const value = measured[SURFACE_KEYS[jobId]];
        return reconcile(
          sel.slug,
          sel.bandId,
          typeof value === "number" ? value : undefined,
        );
      })
      .filter((r): r is Reconciliation => r !== null);

    const confidence = rawConfidence * confidenceMultiplier(reconciliation);

    if (confidence < CONFIDENCE_THRESHOLD) {
      const disagreements = reconciliation
        .filter((r) => r.agreement === "adjacent" || r.agreement === "distant")
        .map((r) => `${r.slug}: ${r.reason}`);
      return fallback(
        disagreements.length > 0
          ? `confidence ${confidence.toFixed(2)} after reconciliation — ${disagreements.join("; ")}`
          : `confidence ${confidence.toFixed(2)} below threshold`,
      );
    }

    const low = data.total_min;
    const high = data.total_max;
    if (typeof low !== "number" || typeof high !== "number" || high < low) {
      return fallback("engine returned an unusable range");
    }

    /*
      Map line items back to our slugs, dropping anything we did not ask for.
      That last part is a safety property, not tidiness: the engine also sells
      roof washes, solar panel cleaning, sealing and gutter work, and it splits
      covered hardstand onto its own line. None of those are offered here, and
      a gutter price must never reach a customer (CLAUDE.md).
    */
    const byJobId = new Map(sentSlugs.map((slug) => [JOB_IDS[slug], slug]));
    const lineItems: QuoteLineItem[] = (data.line_items ?? [])
      .map((item) => {
        const slug = byJobId.get(item.job_id ?? "");
        if (!slug) return null;
        const area = measured[SURFACE_KEYS[item.job_id ?? ""]];
        return {
          slug,
          measured: typeof area === "number" ? area : 0,
          low: item.min ?? 0,
          high: item.max ?? 0,
        };
      })
      .filter((item): item is QuoteLineItem => item !== null);

    return {
      kind: "instant",
      lineItems,
      low: Math.round(low),
      high: Math.round(high),
      confidence,
      rawConfidence,
      measurements: data.measurements ?? {},
      reconciliation,
      siteVisit: needsSiteVisit(reconciliation),
    };
  } catch (error) {
    const reason =
      error instanceof Error && error.name === "AbortError"
        ? "engine timed out"
        : "engine unreachable";
    return fallback(reason);
  } finally {
    clearTimeout(timer);
  }
}
