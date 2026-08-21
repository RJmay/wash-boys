/**
 * Flyer drop plan — wave 1 (FLYER_BRIEF.md).
 *
 * One QR code per suburb batch. The code is what makes the funnel measurable:
 * scans -> landing -> booking started -> booked -> job done -> final $, per
 * printed batch. That table is how suburbs get re-ranked from wave 2 onward.
 *
 * Tiers come from FLYER_BRIEF: 1 premium (highest tickets), 2 volume/home
 * turf, 3 filler. Minyama stays the benchmark suburb at the same quantity
 * every wave so results stay comparable over time.
 */

export type FlyerBatch = {
  /** Printed small on the artwork, and the /go/[code] path segment. */
  code: string;
  suburb: string;
  /** Campaign label stored against the code in qr_codes. */
  campaign: string;
  /** Planned print run for this batch. */
  quantity: number;
};

export const CAMPAIGN_WAVE_1 = "wave1-aug26";

export const FLYER_BATCHES: readonly FlyerBatch[] = [
  { code: "PW1", suburb: "Pelican Waters", campaign: CAMPAIGN_WAVE_1, quantity: 1000 },
  { code: "MIN1", suburb: "Minyama", campaign: CAMPAIGN_WAVE_1, quantity: 1000 },
  { code: "BUD1", suburb: "Buderim", campaign: CAMPAIGN_WAVE_1, quantity: 1000 },
  { code: "ARO1", suburb: "Aroona", campaign: CAMPAIGN_WAVE_1, quantity: 1000 },
  { code: "CUR1", suburb: "Currimundi", campaign: CAMPAIGN_WAVE_1, quantity: 1000 },
  { code: "AURA1", suburb: "Baringa", campaign: CAMPAIGN_WAVE_1, quantity: 500 },
];

export function getBatch(code: string): FlyerBatch | undefined {
  const upper = code.toUpperCase();
  return FLYER_BATCHES.find((b) => b.code === upper);
}

/** Total pieces in the wave — what the printer quotes against. */
export const WAVE_1_TOTAL = FLYER_BATCHES.reduce(
  (sum, b) => sum + b.quantity,
  0,
);
