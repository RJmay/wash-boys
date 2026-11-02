-- 0003_exterior_relaunch.sql — exterior services relaunch (Nov 2026)
--
-- The business moved from ranged pressure-washing quotes to fixed-price
-- exterior services (house wash, driveway, gutter clean, windows, gutter
-- guard), headlined by the $790 Exterior Refresh, with a deposit paid by bank
-- transfer. Prices live in src/data/pricing.json; this migration only gives
-- bookings somewhere to keep what the new Book form collects.
--
-- Additive only. Nothing existing is dropped, so old bookings stay readable.
-- The `availability` table and ensure_availability() from 0002 are no longer
-- read by the site (street days in src/data/street-days.json replaced
-- half-day slots) but are left in place.

-- ── Bookings: new form fields ─────────────────────────────────────────────

alter table bookings
  add column if not exists storeys text,
  -- exterior-refresh | full-exterior | gutter-guard | single
  add column if not exists package text,
  add column if not exists gutter_guard_size text,
  add column if not exists roof_type text,
  -- Fixed price from pricing.json at the time of booking, GST incl.
  add column if not exists quoted_price int,
  -- [{label, amount}] - the line items the customer was shown.
  add column if not exists price_lines jsonb,
  add column if not exists deposit_amount int,
  add column if not exists deposit_status text not null default 'pending',
  add column if not exists deposit_paid_at timestamptz,
  -- Short reference the customer puts on the bank transfer, e.g. WB-7K3F9Q.
  add column if not exists reference text,
  -- Raw ?src= street-group code. Kept even when it is not in qr_codes.
  add column if not exists source text,
  -- Page the visitor came to the Book page from.
  add column if not exists page text,
  -- Owner's own check of the house on a flyer round (size, storeys, access).
  add column if not exists site_checked_at timestamptz,
  add column if not exists site_notes text;

-- Every new-form booking is a morning job; old rows keep their slot.
alter table bookings alter column slot set default 'am';

create unique index if not exists bookings_reference_key on bookings (reference)
  where reference is not null;
create index if not exists bookings_source_idx on bookings (source)
  where source is not null;
create index if not exists bookings_deposit_status_idx on bookings (deposit_status);

alter table bookings
  add constraint bookings_storeys_known check (
    storeys is null or storeys in ('single', 'double')
  ),
  add constraint bookings_package_known check (
    package is null
    or package in ('exterior-refresh', 'full-exterior', 'gutter-guard', 'single')
  ),
  add constraint bookings_gutter_guard_size_known check (
    gutter_guard_size is null
    or gutter_guard_size in ('small', 'medium', 'large', 'not-sure')
  ),
  add constraint bookings_roof_type_known check (
    roof_type is null or roof_type in ('tile', 'metal', 'not-sure')
  ),
  add constraint bookings_deposit_status_known check (
    deposit_status in ('pending', 'paid', 'refunded', 'waived')
  ),
  add constraint bookings_prices_sane check (
    (quoted_price is null or quoted_price >= 0)
    and (deposit_amount is null or deposit_amount >= 0)
  );

-- ── Services catalogue ────────────────────────────────────────────────────
-- Retire the ranged launch catalogue and seed the fixed-price one. The old
-- 'fence-cleaning' row stays retired; fences are re-seeded as 'fences'. Slugs match
-- the ids in src/data/pricing.json, which is what bookings.service_slugs now
-- stores. Keep the prices here in step with that file.

update services set active = false, bookable = false
  where slug in (
    'driveway-cleaning', 'house-washing', 'patio-cleaning',
    'fence-cleaning', 'gutter-cleaning'
  );

insert into services (
  slug, name, from_price, price_low, price_high, description,
  active, sort, bookable, coming_soon, pricing_model
) values
  ('house-wash', 'House soft wash', 450, 450, 450,
   'Walls, eaves and frames, low-pressure soft wash', true, 1, true, false, 'flat'),
  ('driveway', 'Driveway and paths', 250, 250, 250,
   'Concrete or pavers, rotary surface cleaner. Up to 60 m2, extra $4/m2', true, 2, true, false, 'flat'),
  ('gutter-clean', 'Gutter clean', 190, 190, 190,
   'Debris bagged and removed, downpipes flushed', true, 3, true, false, 'flat'),
  ('windows', 'Exterior windows', 180, 180, 180,
   'Outside glass, frames wiped, screens rinsed', true, 4, true, false, 'flat'),
  -- From $120, priced per metre per side and confirmed by phone. Also sold
  -- as an add-on to any bundle (bookings.service_slugs then includes it).
  ('fences', 'Fences and retaining walls', 120, 120, 120,
   'Colorbond, timber and besser block, priced per metre, per side', true, 5, true, false, 'flat'),
  ('gutter-guard', 'Gutter guard supply and installation', 1690, 1690, 3290,
   'Aluminium mesh, fixed price by gutter length, gutter clean included', true, 6, true, false, 'banded')
on conflict (slug) do update set
  name = excluded.name,
  from_price = excluded.from_price,
  price_low = excluded.price_low,
  price_high = excluded.price_high,
  description = excluded.description,
  active = excluded.active,
  sort = excluded.sort,
  bookable = excluded.bookable,
  coming_soon = excluded.coming_soon,
  pricing_model = excluded.pricing_model;
