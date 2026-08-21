import "server-only";

import {
  getBand,
  getService,
  isBanded,
  type ServiceSlug,
} from "@/data/services";
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
  confidence: number;
  measurements: Record<string, unknown>;
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

type EngineResponse = {
  line_items?: { slug?: string; measured?: number; low?: number; high?: number }[];
  total_low?: number;
  total_high?: number;
  confidence?: number;
  measurements?: Record<string, unknown>;
};

/**
 * Ask the engine for a price. Returns a fallback outcome rather than throwing:
 * callers render whatever comes back.
 */
export async function getInstantQuote(
  address: string,
  suburb: string,
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
  const surfaces: Record<string, number> = {};
  const sentSlugs: ServiceSlug[] = [];

  for (const selection of selections) {
    const jobId = JOB_IDS[selection.slug];
    if (!jobId) continue;

    const qty = quantityForSelection(selection);
    if (qty === null) continue;

    jobIds.push(jobId);
    sentSlugs.push(selection.slug);
    surfaces[SURFACE_KEYS[jobId]] = qty;
  }

  if (jobIds.length === 0) return fallback("nothing priceable to send");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/quote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        address,
        suburb,
        state: "QLD",
        job_ids: jobIds,
        surfaces,
        // Total flatwork open to sky, which the engine uses as its headline
        // area. Sum of the flat surfaces we actually sent.
        driveway_exposed_sqm:
          (surfaces.driveway_exposed_sqm ?? 0) + (surfaces.patio_sqm ?? 0),
      }),
      signal: controller.signal,
    });

    if (!response.ok) return fallback(`engine returned ${response.status}`);

    const data = (await response.json()) as EngineResponse;
    const confidence = data.confidence ?? 0;

    if (confidence < CONFIDENCE_THRESHOLD) {
      return fallback(`confidence ${confidence.toFixed(2)} below threshold`);
    }

    const low = data.total_low;
    const high = data.total_high;
    if (typeof low !== "number" || typeof high !== "number" || high < low) {
      return fallback("engine returned an unusable range");
    }

    // Map line items back to our slugs, dropping anything we did not ask for.
    const byJobId = new Map(sentSlugs.map((slug) => [JOB_IDS[slug], slug]));
    const lineItems: QuoteLineItem[] = (data.line_items ?? [])
      .map((item) => {
        const slug = byJobId.get(item.slug ?? "");
        if (!slug) return null;
        return {
          slug,
          measured: item.measured ?? 0,
          low: item.low ?? 0,
          high: item.high ?? 0,
        };
      })
      .filter((item): item is QuoteLineItem => item !== null);

    return {
      kind: "instant",
      lineItems,
      low: Math.round(low),
      high: Math.round(high),
      confidence,
      measurements: data.measurements ?? {},
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
