# Wash Boys

Booking site for a pressure washing business on the Sunshine Coast, QLD.
Nearly all traffic is a phone scanning a QR code on a letterbox flyer, so the
site has one job: turn that scan into a booked job in under two minutes.

- **Conventions and business facts:** [CLAUDE.md](CLAUDE.md)
- **What to build:** [SPEC.md](SPEC.md) (canonical)
- **Build order:** [KICKOFF.md](KICKOFF.md)
- **Flyer artwork and drop plan:** [FLYER_BRIEF.md](FLYER_BRIEF.md)
- **Hosting, env vars and launch setup:** [DEPLOY.md](DEPLOY.md)

## Status

Phase 1, session 1 complete: scaffold, data layer, database schema, Supabase
clients and validation. No UI yet — the landing page is session 2.

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on http://localhost:3000 |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` (run `npm run build` first — Next generates route types) |

## Database

Apply the schema to your Supabase project:

```bash
npx supabase db push
```

Or paste [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql)
into the Supabase SQL editor. It creates the SPEC §6 tables, RLS policies, the
private `job-photos` storage bucket, and seeds the five services.

After creating the owner account, **turn off public signups** in Supabase
(Authentication → Providers → Email → Enable signup: off). The admin RLS
policies trust any authenticated user, and there is exactly one.

### How access works

- The **anon key can do nothing** — RLS is on everywhere and no policy grants
  `anon` anything. Session 8 probes this.
- Public writes (bookings, quote requests, waitlist, events) go through server
  actions using the **service-role key**, which bypasses RLS. Every payload is
  zod-parsed first.
- Admin reads and status changes run as the **authenticated** owner session.

## Layout

```
src/
  data/         business facts — services, suburbs, prices. Nothing hardcoded in components.
  lib/          supabase clients, env, validation, pricing, dates
  app/          routes (landing, /book, /go/[code], /services, /areas, /admin)
supabase/
  migrations/   SQL — SPEC §6 is canonical
```

`src/data/services.ts` is the source of truth for what the customer sees.
The `services` table mirrors it so admin joins and the Phase-2 quote engine
can reference services by slug — **change a price in one, change it in both.**

### Pricing models

| Service | Model | Range |
|---|---|---|
| Driveway & concrete | flat | $150–350 |
| House soft wash | flat | $250–450 |
| Patios, paths & pool surrounds | on area, ~$6–8/m², $99 minimum | $99–400 |
| Fences & retaining | per linear metre per side, ~$8–11/lm, $120 minimum | $120–450 |
| Gutter cleaning | unpriced — waitlist only | — |

Size-priced services make the customer pick a band, stored on the booking as
`service_options` so the saved estimate is reproducible. Every rate lives in
`RATES` in [src/data/services.ts](src/data/services.ts). Fences are offered as
the add-on when a house wash is selected, as well as on their own card.

### Never lose a booking

`source_code` and `events.code` are foreign keys to `qr_codes`, so an unknown
code — mistyped, stale cookie, deleted after a reprint — would otherwise abort
the write. Triggers move the unrecognised code into the row's `utm`/`meta` and
null the column, so the booking always lands and the raw value survives.

## Before anything is printed

`[PHONE]`, `[ABN]` and `[DOMAIN]` appear only in
[src/data/business.ts](src/data/business.ts). Replace them there and the whole
site updates. Every trust claim on the site — insured, ABN, re-wash guarantee
— must be true before flyers drop (SPEC §9).

Gutter cleaning is **never bookable and never priced** until the owner is
qualified for it. Every gutter enquiry goes to the waitlist. This is enforced
in the zod schema, in `src/data/services.ts`, and by a CHECK constraint in the
database.
