# SPEC.md — Website, Booking, QR & Phase-2 Quote Engine

Canonical build spec. CLAUDE.md holds conventions; this holds the what.

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
| `/` | Landing: convert or route to /book |
| `/book` | Multi-step booking flow |
| `/go/[code]` | QR redirect + scan logging (302) |
| `/services/[slug]` | 5 service pages (SEO + detail) |
| `/areas/[suburb]` | Suburb pages for the corridor (SEO) |
| `/quote` | Photo quote-request (non-standard jobs) |
| `/reviews` | Reviews (embed/paste Google reviews as they land) |
| `/contact` | Phone, email, service-area map |
| `/admin` | Auth-gated ops (see §8) |

## 4. Landing page (`/`)

Order of sections, mobile-first:

1. **Sticky mini-bar:** brand mark + `tel:` phone (tap logged) + "Book now".
2. **Hero:** before/after slider (or typographic v0). Headline states the
   outcome plainly ("Driveways, houses and gutters — looking new again").
   Sub-line names the area ("Local crew covering Caloundra to Buderim").
   One yellow CTA: "Book in 60 seconds". Under it, three trust ticks:
   Fully insured · Local owner-operated · Re-wash guarantee.
3. **Services grid:** 4 bookable cards, each with from-price and "Add to
   booking" (selection pre-fills /book), plus a fifth "Gutter cleaning —
   coming soon" card that opens the waitlist capture (name, mobile,
   suburb) — never the booking flow.
4. **How it works:** 3 steps — Pick services → Pick a time → We confirm by
   text. Note "Final price confirmed on site before we start. Pay on the
   day."
5. **Bundle nudge:** "Book 2+ services, save 15%" (drives the $500–900
   ticket target). Auto-applies in the booking flow.
6. **Proof strip:** before/after pairs + Google review cards (real ones
   only; hide section until they exist).
7. **Service area:** simple map graphic + suburb chips linking to /areas.
8. **Seasonal slot (Sept–Nov):** storm-season banner driving the gutter
   waitlist: "Gutter cleaning is coming — join the list and we'll call you
   first." No price shown.
9. **FAQ:** water usage, insurance, surfaces we won't damage, two-storey
   policy (quote-only for now), payment, weather/rain policy.
10. **Footer:** ABN, insurance line, phone, email, suburbs, privacy page.

## 5. Booking flow (`/book`)

Four steps, progress bar, state preserved, each step < 15 seconds:

1. **Services** — multi-select cards with from-prices; live estimate range
   totals at the bottom (e.g. "Estimated $270–600 · final confirmed on
   site"); bundle discount auto-shown at 2+ services. Gutter cleaning
   appears greyed as "coming soon — join the waitlist" linking to the
   capture; it is never selectable.
2. **Address** — street address text + suburb `<select>` limited to the
   service-area list. Out-of-area suburbs get a soft catch: "We're not in
   [X] yet — leave your number and we'll call if we head that way" (logged
   as a lead, not a booking). Address is stored verbatim; geocoding is a
   later nicety.
3. **Time** — date picker over the next 14 days + AM/PM half-day slot.
   Availability from the `availability` table: default capacity 2 bookings
   per half-day, Tue–Sat, plus optional Sun PM. Fully booked slots shown
   disabled ("Booked out — scarcity is honest here, don't fake it").
4. **Details** — name, mobile (required, AU format), email (optional),
   gate/pet/parking notes, optional photo upload (Supabase Storage).

**Confirm screen:** "Booked ✔ — we'll text you to confirm your exact
arrival window." Show summary + estimate range + what happens next.
Effects: insert booking; email customer (Resend); email owner with a
one-tap `tel:` link to the customer; increment funnel events. Status
starts `new`; owner confirms by text and flips to `confirmed` in admin.

No payment, no account creation, no login for customers — ever, in v1.

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
