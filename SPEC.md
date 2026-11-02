# SPEC.md — Website, Booking, QR & Phase-2 Quote Engine

Canonical build spec. CLAUDE.md holds conventions; this holds the what.

> **Nov 2026 relaunch — read this first.** The business relaunched as a
> two-person exterior home services company: house soft wash, driveway,
> gutter clean, exterior windows and gutter guard, headlined by the $790
> Exterior Refresh, with fixed prices and a deposit by bank transfer. The
> owner's brief is in `docs/brief/` (business-brief.md, site-content.md) and
> is the source of truth for copy. §3–5 below are rewritten for it; §1–2,
> §6–11 are the original launch spec, still accurate except where a note
> says otherwise. Anything here that contradicts `docs/brief/` loses.

---

## 1. Goal and funnel math

One conversion: **QR scan → completed booking.** Secondary: phone call tap,
photo quote request.

Working numbers from prior flyer testing (hold the site to these):
- Enquiry rate: 0.15–0.5% of flyers dropped
- Close rate: 50–65% of enquiries
- So 5,000 flyers ≈ 7–25 enquiries ≈ 4–16 jobs. At a $500–900 bundle
  target, one 5,000-flyer wave should return roughly $2k–14k. The website's
  job is to hold the top of that range by making booking easier than
  calling.

Every step of the funnel is measured per QR code (per suburb batch):
scans → landing views → booking started → booking completed → job done →
final $. That table is how drop suburbs get ranked from wave 2 onward.

## 2. Brand & design direction

Name: **Wash Boys** — locked (Ryan's ASIC name check passed). Sibling
brand to the Paper Boy flyer arm; back-pocket alternates: Wash Run /
Water Run (pairing with Paper Run). Domain still needed: try
washboys.com.au, thewashboys.com.au or washboys.au (registration needs
the ABN — already held); fill [DOMAIN] once bought.

Design intent: **trustworthy local operator, not a template.** The person
scanning is deciding whether to let strangers onto their property.

- Palette (cool, clean, wet-concrete — deliberately not the warm-cream AI
  default): `#EEF1F1` washed-concrete background, `#1B2328` charcoal text,
  `#123C52` deep harbour blue (primary, headers/footer), `#FFC900` hi-vis
  yellow reserved for the single CTA and the QR frame on the flyer, plus
  pure white cards. Same palette on flyer and site so the scan feels
  continuous.
- Type: one condensed display face with signage energy (e.g. Anton or
  Archivo Black) used sparingly for headlines and prices; one clean body
  face (e.g. Figtree/Inter). Tabular numerals for all prices.
- Signature element: a **draggable before/after slider as the hero** —
  the single most persuasive artifact this trade has. Until real photos
  exist (soft-launch week), ship a bold typographic hero; swap in the real
  slider the week the first driveways are done. Hard rule: real photos of
  our actual work only. No stock before/afters.
- Everything else stays quiet: generous spacing, white cards, one accent.
  Run the frontend-design pass (plan tokens → critique → build) before
  writing landing-page code.

## 3. Site map

| Route | Purpose |
|---|---|
| `/` | Home: $790 Refresh + Book above the fold on a phone |
| `/services` | One section per service |
| `/services/[slug]` | house-washing, driveway-cleaning, gutter-cleaning, window-cleaning, fence-cleaning |
| `/pricing` | Bundles (large cards), single services, gutter guard, surcharges |
| `/gutter-guard` | Packages table, warranty placeholder, book CTA |
| `/areas` | All suburbs; priority suburbs first |
| `/areas/[suburb]` | One per suburb in `src/data/suburbs.ts` (30) |
| `/how-it-works` | Four steps |
| `/faq` | FAQ + FAQPage schema (placeholder answers excluded) |
| `/book` | Booking form → deposit step → confirmation |
| `/privacy` | Privacy |

Retired and permanently redirected (next.config.ts): `/contact`, `/reviews`,
`/quote`, `/services/patio-cleaning`. (`/services/fence-cleaning` is live
again: fences were re-added 2 Nov 2026, from $120 per metre per side.)

## 4. Pages

Copy is `docs/brief/site-content.md`, used as written. Every price renders
from `src/data/pricing.json` via `src/data/pricing.ts`.

- **Above the fold, every home and suburb page, 375px phone:** bundle price
  and a Book button. The hero is text only; photos sit lower. The sticky bar
  also carries "Book $790" on every page.
- **Suburb pages** target "house washing / pressure cleaning / gutter
  cleaning / gutter guard [suburb]": title, H1, service list headings and
  Service schema per service. Intro is the owner's blurb from
  `service-areas.json` where there is one, else the suburb's hook.
  "We're booking [suburb] streets on:" reads `src/data/street-days.json`
  and shows `[NEXT DATES]` when empty.
- **Placeholders:** every claim not yet true (insurance, reviews, warranty,
  bank details, missing photos) lives in `src/data/placeholders.ts` and
  renders visibly in a dashed box until filled.
- **Photos:** real pairs only, tagged by service in `src/data/site.ts`.
  A service with no pair shows its placeholder slot.

## 5. Booking (`/book`)

One-page form, fields in the brief's order: name, mobile, email (all
required), street address, suburb (list + "Other"), storeys, what would you
like (Exterior Refresh / Full Exterior / Gutter guard with size / single
services, plus an "add fences" option on every non-single choice), roof type (gutter guard only, incl. Full Exterior), preferred
day (the suburb's street days, else a date picker), photos (optional, up to
4, shrunk in the browser), notes. Hidden: `source` (from `?src=` or the
attribution cookie) and `page` (same-origin referrer).

Server action (`src/lib/actions/booking.ts`) re-prices from pricing.json,
checks the day is under `capacityPerDay`, saves with a reference
(`WB-XXXXXX`), uploads photos to `job-photos/bookings/<ref>/`, emails both
sides, logs `book_done`. Then:

1. **Deposit step:** $100 cleaning / $300 anything with gutter guard, by
   bank transfer with the reference. `deposit_status` starts `pending`; the
   owner marks it paid.
2. **Confirmation:** "You're booked for [date]. We'll text you the day
   before."

Suburb "Other" saves a lead (no deposit) and shows "we'll call you".

## 6. Data model (Supabase — canonical schema)

```sql
create table services (
  id serial primary key,
  slug text unique not null,
  name text not null,
  from_price int not null,
  price_low int not null,
  price_high int not null,
  description text,
  active boolean default true,
  sort int default 0
);

create table qr_codes (
  code text primary key,          -- e.g. 'PW1', 'BUD1'
  campaign text not null,         -- 'wave1-aug26'
  suburb text,
  destination text not null default '/',  -- re-pointable after print
  created_at timestamptz default now()
);

create table events (
  id bigserial primary key,
  ts timestamptz default now(),
  type text not null,             -- scan | land | book_start | book_done |
                                  -- call_tap | quote_req | lead_out_of_area
  code text references qr_codes(code),
  meta jsonb
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  status text not null default 'new',  -- new|confirmed|done|cancelled|no_show
  name text not null,
  phone text not null,
  email text,
  address text not null,
  suburb text not null,
  service_slugs text[] not null,
  bundle_discount boolean default false,
  est_low int, est_high int,
  preferred_date date not null,
  slot text not null,             -- 'am' | 'pm'
  notes text,
  photo_urls text[],
  source_code text references qr_codes(code),
  utm jsonb
);

create table availability (
  day date not null,
  slot text not null,
  capacity int not null default 2,
  primary key (day, slot)
);

-- TRAINING DATA for the Phase-2 quote model. Log after EVERY job.
create table jobs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id),
  done_at date not null,
  address text not null,
  suburb text not null,
  service_slugs text[] not null,
  quoted_low int, quoted_high int,
  final_price int not null,
  duration_mins int not null,
  crew_size int default 1,
  surfaces jsonb,                 -- {driveway_m2, gutter_lm, house_storeys,
                                  --  render|brick|weatherboard, condition_1to5}
  photo_urls text[],              -- before/afters -> also marketing assets
  notes text
);

create table quote_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text, phone text not null, suburb text,
  description text, photo_urls text[],
  source_code text, status text default 'new'
);

-- Demand capture for services not offered yet (gutters first).
create table service_waitlist (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  service_slug text not null default 'gutter-cleaning',
  name text, phone text not null, suburb text,
  source_code text references qr_codes(code),
  notified boolean default false
);
```

RLS: anon key can do nothing directly; all public writes go through server
actions using the service role with zod-validated payloads. Admin reads via
authenticated Supabase session.

## 7. QR & tracking system

> **Nov 2026:** flyer QRs carry `?src=STREETGROUP` (one code per flyer
> street group) straight to the site. The code is stamped into the `wb_c`
> cookie and saved raw on `bookings.source`. `/go/[code]` below was
> specified but never built; `?c=` is still read as a fallback.

- `/go/[code]`: look up code → log `scan` event → 302 to
  `destination?c=CODE&utm_source=flyer&utm_campaign={campaign}`. Unknown
  code → 302 to `/` with `c=unknown` (never a 404 off a printed flyer).
- `c` param persists via a first-party cookie so `book_done` attributes
  back to the flyer batch even if they browse first.
- **Never print a raw URL in a QR.** Only `/go/` codes — destinations stay
  re-pointable after print (e.g. point BUD1 at the gutter page in
  September without reprinting).
- `scripts/qr.ts`: takes `--code`, upserts the row, outputs SVG + 600px PNG
  with quiet zone, high error correction (H), sized for 28×28mm at 300dpi.
- Human-readable fallback printed under every QR: `[DOMAIN]` (the bare
  domain, typable — not the /go/ path).
- Admin funnel view (§8) renders per-code: scans → bookings → revenue.

## 8. Admin (`/admin`, Supabase auth, single user)

Four screens, phone-usable (it will be used from a driveway):
1. **Today/upcoming:** bookings by date+slot; tap-to-call; status buttons
   (confirm / done / cancel / no-show).
2. **Log job** (opens when marking done): final price, duration, crew,
   surfaces jsonb quick-form, photo upload, notes. 60 seconds max to fill.
   This screen is non-negotiable — it builds the quote-model dataset.
3. **QR codes:** list, create, re-point destination, per-code funnel table.
4. **Leads:** quote requests, out-of-area leads and the gutter waitlist,
   with status.

## 9. SEO & launch checklist

- Service pages: what's included, price range, before/afters, FAQ, CTA.
  Gutter cleaning gets a coming-soon page (SEO-indexed now, waitlist CTA,
  no pricing) that flips to bookable later without a URL change.
- Suburb pages generated from `src/data/suburbs.ts` (name, blurb hook —
  e.g. Buderim: shade/tree cover → mould, moss, full gutters; Pelican
  Waters: salt air on render, exposed-agg driveways). Unique 150+ words
  each, LocalBusiness + Service schema, sitemap, OG images.
- Google Business Profile day one (Aroona base, service-area business,
  corridor suburbs listed). Review link QR printed for the van/invoices.
- Launch checklist: domain + email on domain (bookings@), Resend domain
  verified, phone number live, PL insurance certificate (site claims must
  be true before flyers drop), ABN in footer, privacy page, 404, Lighthouse
  ≥ 90 mobile, test booking end-to-end on a real phone via a printed test
  QR, seed 4 weeks of availability.

## 10. Phase 2 — instant quote engine (build later, design for now)

> **Nov 2026:** fixed pricing replaced the ranges this section assumes, and
> the unused website bridge (`src/lib/quote-engine.ts`,
> `quote-reconcile.ts`) was removed — it is in git history before the
> relaunch commit. The Python engine in `quote-engine/` is untouched. Any
> future use is likely sizing (driveway m², gutter metres) rather than
> pricing.

Existing asset: the FastAPI quoting engine (Railway + Supabase) already
built for landscaping/pressure washing — Claude-vision satellite analysis,
QLD DCDB cadastral boundaries for exact parcels, gutter linear metres,
driveway/overhang splitting, weather condition scoring, rate tuner.

Integration contract (stub now, wire later):

```
POST {QUOTE_ENGINE_URL}/quote
  { address: string, suburb: string, service_slugs: string[] }
→ { line_items: [{slug, measured, low, high}],
    total_low, total_high, confidence: 0–1, measurements: {...} }
```

Where it slots in: between booking steps 2 and 3. If `confidence ≥
threshold`, show the instant price and book at it; else fall back to
today's range flow. No other step changes — this is why step boundaries
stay clean now.

**Gate (don't wire it in before this):** ≥ 30–50 logged jobs in `jobs`,
rates calibrated so the engine's mid-point is within ~10–15% of
`final_price` on a backtest of those jobs. The admin job logger is the
flywheel: every job logged makes the instant quote launchable sooner.

## 11. Flyer print template (in-repo)

`flyer/dl-flyer.html`: DL 99×210mm + 3mm bleed (print canvas 105×216mm),
300dpi-equivalent, CMYK-safe colours, front/back as two pages, QR + code
text + suburb injected via query/params so one template renders every
batch variant; print to PDF for the printer. Content spec lives in
FLYER_BRIEF.md — keep artwork and copy there, mechanics here.
