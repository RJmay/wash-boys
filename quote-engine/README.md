# Quote engine

The Phase-2 instant quote service (SPEC §10). FastAPI, deployed to Railway,
called by the website through `QUOTE_ENGINE_URL`.

Imported from its own repo in Aug 2026. Only the Python backend came across —
it had a second Next.js frontend for the same business, and keeping two UIs is
how the two price lists drifted apart in the first place. **The Wash Boys site
is the frontend.**

## What it does

```
address → geocode → aerial imagery → Claude vision → measurements → price
```

- **Imagery: Queensland Government, not Google.** Sunshine Coast LGA is flown
  annually at 10cm (latest capture 2025-06-06) against Google's irregular
  15-30cm. Free, no key, no quota. See `qimagery_agent.py`.
- **Boundaries:** QLD DCDB cadastral parcels, so measurements are clipped to
  the actual lot rather than guessed from a square around a pin.
- **Boundary overlay is drawn locally.** The parcel outline used to come from
  Google Static Maps; it is now drawn onto the Queensland tile from the DCDB
  geometry we already have. Without an outline the vision model measures a
  fixed square of suburb and cannot tell which roof belongs to the customer —
  it returned a 392m² roof on a 753m² block by counting the neighbours.
- **Google is used for geocoding only** — one call per quote, turning an
  address into coordinates. It stays because OpenStreetMap house-number
  coverage across the corridor is 8–14%, so Nominatim would put most customers
  on a street or suburb centroid and measure the wrong property.

## Running it

```bash
pip install -r requirements.txt
cp .env.example .env     # then fill it in
uvicorn main:app --reload
```

`ANTHROPIC_API_KEY` and `GOOGLE_MAPS_API_KEY` are both required.
`DATABASE_URL` is optional — omit it and you get local SQLite.

> The Google key must be restricted by **IP address**, not HTTP referrer.
> Geocoding is a server-side API with no referrer, so a referrer-restricted key
> is rejected outright with `REQUEST_DENIED`, which reads like a billing or
> enablement problem and is not one.

> `DATABASE_URL` is a Postgres connection string, not the Supabase project URL.
> Supabase shows both; the one you want is Settings → Database → Connection
> string → URI, and it starts `postgresql://`. An `https://` value fails at
> import with `Can't load plugin: sqlalchemy.dialects:https`, which does not
> obviously point at the cause.

Test quotes (each real one is a paid Claude call):

```bash
python generate_test_quotes.py --dry-run --count 5    # payloads only, free
python generate_test_quotes.py --count 5              # 5 real quotes
```

## How the website uses it

`src/lib/quote-engine.ts` in the site calls `POST /quote`, then
`src/lib/quote-reconcile.ts` cross-checks the measurement against the size band
the customer picked. Imagery is 12-18 months old at best, so a slab poured last
spring is invisible to it while the customer is standing in front of it:

| Measurement vs customer | What happens |
|---|---|
| Same band | Price from the measurement |
| Measured **smaller** | Imagery likely stale — price on what they can see |
| Measured **larger** | Ambiguous — widen the range rather than talk them up |
| 2+ bands apart | No instant quote; confirm on site |

Every disagreement is recorded. Whether customers systematically under-call
their driveways, and how stale the imagery runs per suburb, are things only
those deltas can tell us.

## Deploying

Railway, from the `quote-engine/` directory — set the service root there, not
the repo root, or Nixpacks will find the Node project and build the website
instead.

The website's GitHub Actions workflow ignores `quote-engine/**`, so a change in
here never triggers a Cloudflare deploy.

**Attach Postgres before you care about the data.** Without `DATABASE_URL` it
falls back to SQLite on the container filesystem, which Railway wipes on every
redeploy.

## Do not switch it on yet

SPEC §10 gates this behind **30-50 logged jobs** with the engine's midpoint
within 10-15% of `final_price` on a backtest. Setting `QUOTE_ENGINE_URL` on the
website turns instant quotes on; until there are real jobs to calibrate
against, the rates here are market estimates and the reconciliation thresholds
are guesses.

**The two rate cards do not agree yet.** A live `/quick-quote` on a real
Wurtulla property, Sept 2026:

| | website (`src/data/services.ts`) | engine |
|---|---|---|
| 60m² driveway | $210–300 (double band) | **$305–390** |
| covered hardstand | not a line item at all | $85–110 |
| house soft wash | $250–330 (small band) | $250–300 |

House wash agrees. The driveway does not — the engine is roughly 45% over the
band the website publishes for that size, and it bills covered hardstand
separately, which the site's model has no concept of. Turning the engine on
against today's rates would quote a customer materially more than the page they
just read.

That is the gap the 30-50 job gate exists to close: `final_price` on real jobs
decides which card is right, and the loser gets moved. Do not reconcile them by
guessing now.

## Layout

| File | Purpose |
|---|---|
| `jobs_config.py` | **Rate card + pricing prompt.** Tune `TARGET_HOURLY` here |
| `main.py` | FastAPI app and endpoints |
| `models.py` | Request/response models |
| `maps_agent.py` | Orchestrates geocode, imagery and the vision call |
| `qimagery_agent.py` | Queensland imagery + capture dates |
| `cadastre_agent.py` | DCDB parcel boundaries |
| `condition_agent.py` | Weather and suburb condition scoring |
| `rate_tuner.py` | Adjusts rates from actual-versus-quoted feedback |
| `seed_db.py` | Seeds the catalogue from `jobs_config` |
