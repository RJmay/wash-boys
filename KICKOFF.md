# KICKOFF.md — Build order & paste-ready Claude Code prompts

## Session 0 — you, not Claude Code (~1 hour)

1. Name's locked: Wash Boys. Buy the domain (try washboys.com.au /
   thewashboys.com.au / washboys.au — registration needs your ABN) and set
   up an email on it. Fill [DOMAIN]/[PHONE]/[ABN] in CLAUDE.md.
2. Create the Supabase project; note URL + anon + service-role keys.
3. Create a Resend account; add + verify the domain.
4. `mkdir wash-site && cd wash-site && git init`, drop CLAUDE.md, SPEC.md
   and FLYER_BRIEF.md into the repo root, then start `claude` in that
   directory. Connect the repo to GitHub → Vercel (auto-deploys, same loop
   as your previous sites).

Run the sessions below in order. Keep each to one session; commit at the
end of each. If Claude Code proposes deviating from SPEC.md, make it argue
the case against the spec first.

## Session 1 — Scaffold + database

> Read CLAUDE.md and SPEC.md fully. Scaffold the Next.js App Router +
> TypeScript + Tailwind project per the CLAUDE.md directory map. Create
> `supabase/migrations/0001_init.sql` implementing the SPEC §6 schema
> exactly, plus RLS policies per §6, and a seed for the 4 launch services
> with the price anchors from CLAUDE.md (gutter cleaning seeded as a
> non-bookable coming-soon flag). Add `src/data/suburbs.ts` covering
> the Sippy Downs/Buderim → Nirimba/Pelican Waters corridor with a
> one-line grime/character hook per suburb for SEO later. Set up typed
> Supabase clients (anon + service-role, server-only), zod schemas for
> bookings/quote requests/events, and the .env template. Nothing visual yet.

## Session 2 — Design system + landing page

> Build the landing page per SPEC §4 using the design direction in §2. Do a
> proper design pass first: propose the token system (palette from §2,
> type scale, spacing), one signature element (the before/after hero
> slider with a typographic v0 fallback flag), critique it against
> "would a homeowner trust this with their house", then build. Mobile-first
> at 375px, LCP < 2s, semantic HTML, the sticky call/book bar, and log
> `land` + `call_tap` events. Placeholder photo slots clearly marked — no
> stock imagery.

## Session 3 — Booking flow

> Build `/book` per SPEC §5: four steps, live estimate range with the 15%
> bundle rule, suburb-restricted address step with the out-of-area lead
> catch, availability-driven date/slot picker (seed 4 weeks Tue–Sat AM/PM
> capacity 2, Sun PM capacity 1), details step with AU mobile validation
> and optional photo upload to Supabase Storage, plus the gutter waitlist
> capture off the greyed service card (writes service_waitlist). Server
> actions with zod;
> on success insert the booking with source code + utm from the cookie,
> fire Resend emails to customer and ADMIN_EMAIL, log `book_start`/
> `book_done`. Then walk me through a full test booking.

## Session 4 — QR redirect system

> Implement `/go/[code]` per SPEC §7: code lookup, `scan` event, 302 with
> `c` + utm params, first-party cookie attribution, unknown-code fallback
> to `/`. Build `scripts/qr.ts` (npm run qr -- --code PW1 --campaign
> wave1 --suburb "Pelican Waters") that upserts the row and outputs
> SVG + 600px PNG, error correction H, sized for 28mm print. Generate test
> code TEST1 and prove the full chain: scan → land → book_done shows in
> events with the code attached.

## Session 5 — Admin

> Build `/admin` per SPEC §8 behind Supabase auth (single user):
> today/upcoming bookings with tap-to-call and status changes; the
> mandatory job logger on "done" (final price, duration, surfaces jsonb
> quick-form, photos, ≤60s to complete); QR code manager with re-pointable
> destinations and a per-code funnel table (scans → bookings → revenue by
> joining events, bookings, jobs); leads list. Phone-usable — I'll be on a
> driveway.

## Session 6 — SEO pages

> Build `/services/[slug]` (including the gutter coming-soon/waitlist
> page) and `/areas/[suburb]` per SPEC §9 from
> src/data, each unique and 150+ words with LocalBusiness/Service schema,
> plus sitemap, robots, OG images, /reviews, /contact, privacy page, 404.
> Then a Lighthouse pass on mobile — get ≥90 across the board and show me
> what you fixed.

## Session 7 — Flyer template

> Build `flyer/dl-flyer.html` per SPEC §11 and FLYER_BRIEF.md: both sides
> at 105×216mm (99×210 + 3mm bleed) with crop-safe margins, the exact
> palette, front/back content per the brief, QR image + code + suburb
> injected via query params, and a small npm script that renders
> print-ready PDFs for a list of codes (PW1, MIN1, BUD1, ARO1, CUR1,
> AURA1). Output the six PDFs.

## Session 8 — Hardening + launch

> Run the SPEC §9 launch checklist end-to-end and produce a pass/fail
> report: real-phone test booking via printed TEST1 QR, email delivery,
> event attribution, RLS probe (anon key must not read/write directly),
> availability edge cases, out-of-area path, 4 weeks availability seeded,
> footer legals. Fix everything that fails.

## After launch — the operating loop

Every job: log it in admin (that's the quote-model dataset), shoot the
before/after, ask for the Google review. Every wave: read the per-code
funnel, re-rank suburbs, adjust the offer. At 30–50 logged jobs: backtest
the FastAPI quote engine against `jobs`, tune rates, and wire Phase 2 in
per SPEC §10 — instant prices land between steps 2 and 3 with no other
change to the flow.
