# FLYER_BRIEF.md — Artwork, Offers & Drop Plan

## Format & print spec

- Format: DL 99×210mm double-sided, 3mm bleed all round (artwork
  105×216mm), 300dpi, CMYK. A5 (148×210mm, artwork 154×216mm) is the
  held-back wave-2 test for premium suburbs — ~50% more photo canvas, but
  ~50% more paper weight and a higher unit price.
- Stock: 250gsm gloss art — the "card flyer" tier (Ryan's call: thicker
  than the standard 150gsm; the card feel reads premium and survives the
  letterbox). Rider weight check: 250gsm DL ≈ 5.2g each, so 1,000 in the
  satchel ≈ 5.2kg (vs ≈3.1kg at 150gsm).
- Same palette as the site (SPEC §2) so scan → landing feels continuous:
  washed-concrete `#EEF1F1`, charcoal `#1B2328`, harbour blue `#123C52`,
  hi-vis yellow `#FFC900` reserved for the CTA and the QR frame.
- Order 1,000+ per version — unit price drops hard at 1,000 (prior
  research). 4–6 QR versions × 1,000–1,500 each for wave 1. Online digital
  printers (Easy Signs, Vistaprint et al.) charge little extra per version;
  get one quote for "6 kinds × 1,000, DL double-sided, 250gsm gloss".
- QR: minimum 28×28mm printed, error correction H, full quiet zone, dark
  module on light ground only. Test-scan a home print at arm's length in
  bad light before sending to the printer.

## Front (the hook — one glance from letterbox to bin decides this)

1. Full-width **before/after driveway split** (real photo from soft-launch
   week; batch-1 fallback: bold type block, no stock photos).
2. Headline, huge condensed type: **"Your driveway. Like new."** (alt:
   "Make your place look brand new again.")
3. One line: "Driveways · House washes · Patios — local crew, Caloundra to
   Buderim."
4. The yellow-framed **QR** with "Book online in 60 seconds — see prices
   instantly" + the bare domain typed under it + the phone number large.
   Three ways in: scan, type, call. Nothing else on the front.

## Back (the case)

- Services with from-prices: Driveway from $150 · House wash from $250 ·
  Patios & paths from $99 · Fences/retaining quoted.
- **Bundle line (the ticket-builder): "Book 2+ services, save 15%."**
- Trust bar: Fully insured · Local owner-operated · ABN [ABN] ·
  "Not happy? We re-wash it free."
- Seasonal hook (print on Aug–Oct batches): "Gutter cleaning is coming
  this storm season — join the waitlist at [DOMAIN] and we'll call you
  first." No price — the service goes live once qualified.
- QR repeated small + domain + phone.

## Offer strategy

One offer per batch, tracked per QR code. Recommended wave 1: the 15%
bundle (pushes the $500–900 ticket target and is margin-safe). Hold
"$99 driveway with any house wash" as the wave-2 test against it. The
gutter waitlist line rides along on every batch through spring rather than
being the offer.

## Where to drop — wave 1 (corridor: Sippy Downs/Buderim ↔ Nirimba/Pelican Waters)

Rank by owner-occupied detached homes × visible grime × ticket size, not by
walking speed (paid-flyer economics ≠ wash-lead economics):

| Tier | Suburbs | Why | Qty |
|---|---|---|---|
| 1 — Premium | Pelican Waters, Minyama (benchmark), Buddina, Moffat Beach, Shelly Beach, Dicky Beach, Buderim | Canal/beachside salt on render, exposed-agg driveways, big Buderim blocks under tree shade = mould + moss + full gutters; highest tickets | 500–1,000 ea |
| 2 — Volume/home turf | Aroona, Currimundi, Battery Hill, Golden Beach, Wurtulla, Warana, Bokarina | 80s–2000s owner-occupied stock, salt-side grime, minutes from base → cluster jobs, low windscreen time | 500–1,000 ea |
| 3 — Filler only | Nirimba, Baringa, Banya (Aura), Palmview (Harmony), Sippy Downs | Fast to walk (~500/hr Nirimba/Palmview, ~330 Sippy Downs) but new builds carry less grime and more renters/investors → weakest conversion; drop surplus stock, favour Sippy Downs' established pockets | ≤500 ea |

- **Second pass on the same suburbs 2–3 weeks later** — response climbs on
  the second drop (prior finding). Budget wave 1 twice before judging any
  suburb.
- Minyama stays the benchmark suburb — same quantity each wave so results
  are comparable over time.
- From late Aug through Sept, weight extra stock to Buderim and any street
  under big trees — the gutter waitlist line pre-loads storm-season demand
  (spikes Sept–Nov) so the service launches with a ready call list.
- Skip apartments/units and obvious rental complexes; target streets of
  detached homes with visible driveway staining (mark them while doing
  paid flyer runs — zero-cost recon).

## Funnel maths to hold the plan against

At 0.15–0.5% enquiry and 50–65% close: 6,000 flyers ≈ 9–30 enquiries ≈
5–19 jobs ≈ roughly $1.5k–11k at pressure-only tickets ($300–600 blended). If a suburb's code shows
scans but no bookings, the site is leaking — fix the flow. Scans absent
entirely → the flyer front failed → change the hero or offer, not the
suburb, first.

## Production path

Template `flyer/dl-flyer.html` renders both sides at print size with the
QR + code injected per batch (KICKOFF session 7). Export PDF per version,
soft-proof, order the gang run. Before printing: PL insurance active, ABN
correct, phone live, domain live, test QR scanned end-to-end to a
completed test booking.
