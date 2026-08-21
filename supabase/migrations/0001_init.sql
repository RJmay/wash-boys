-- 0001_init.sql — Wash Boys initial schema
--
-- Implements SPEC §6 (canonical). Apply with `npx supabase db push`, or paste
-- into the Supabase SQL editor.
--
-- Deviations from the literal SPEC §6 DDL, all additive — no column in the
-- spec was renamed, retyped or dropped:
--
--  1. services gains `bookable`, `coming_soon` and `pricing_model`. KICKOFF
--     session 1 asks for gutter cleaning to be seeded behind a "non-bookable
--     coming-soon flag", and the spec's services table has nowhere to put one.
--     `pricing_model` records that patios are priced on area and fences on
--     length, which the spec's single from/low/high triple cannot express.
--  2. bookings gains `service_options` jsonb — the size band the customer
--     picked for each size-priced service. Without it the saved estimate is
--     not reproducible, and the jobs table loses the size signal the Phase-2
--     quote model needs.
--  3. A `leads` table. The spec has no home for the out-of-area catch in
--     booking step 2, which would otherwise put customer names and phone
--     numbers in the append-only events log. Leads are contactable people
--     with a status the owner works through; events are counters.
--  4. CHECK constraints on the status/slot/type columns the spec documents in
--     comments, so a bad enum value fails at write time instead of silently
--     landing in the funnel data.
--  5. A CHECK that a coming-soon service cannot hold a price. "No gutter
--     pricing anywhere until that service is live" (CLAUDE.md) is a rule
--     worth enforcing in the database, not just in copy.
--  6. Triggers that stop an unknown QR code from destroying a write — see
--     "Never lose a booking" below.
--  7. Indexes for the admin funnel query and the availability lookup.
--  8. A private `job-photos` storage bucket.
--
-- ── Never lose a booking ─────────────────────────────────────────────────
-- bookings.source_code, events.code and service_waitlist.source_code are FKs
-- to qr_codes. A code that is not in qr_codes — a mistyped flyer code, a stale
-- cookie, the 'unknown' fallback from /go/[code], or a code deleted after a
-- reprint — would raise a foreign-key violation and lose the write. For a
-- booking that is a $150-800 job on the floor because of an attribution
-- detail.
--
-- The triggers below make that impossible: an unrecognised code is moved into
-- the row's jsonb (utm/meta) and the FK column is set to NULL, so the write
-- always lands and the raw code is still there to investigate. Server actions
-- should still resolve codes up front; this is the net under that.

-- ── Services ──────────────────────────────────────────────────────────────
-- Mirrors src/data/services.ts. That file drives what the customer sees; this
-- table is here so admin, funnel joins and the Phase-2 quote engine can
-- reference services by slug. Slug is the join key across both.

create table services (
  id serial primary key,
  slug text unique not null,
  name text not null,
  from_price int not null,
  price_low int not null,
  price_high int not null,
  description text,
  active boolean default true,
  sort int default 0,
  -- Additive (see header note 1).
  bookable boolean not null default true,
  coming_soon boolean not null default false,
  -- 'flat'     one range for the job (driveway, house wash)
  -- 'banded'   priced on size; the bands live in src/data/services.ts and the
  --            from/low/high here span the whole ladder
  -- 'unpriced' not sellable yet, shows no price anywhere
  pricing_model text not null default 'flat',
  constraint services_pricing_model_known check (
    pricing_model in ('flat', 'banded', 'unpriced')
  ),
  constraint services_price_sane check (
    from_price >= 0 and price_low >= 0 and price_high >= price_low
  ),
  -- A service we cannot sell yet must not carry a price anywhere.
  constraint services_unpriced_is_zero check (
    pricing_model <> 'unpriced'
    or (from_price = 0 and price_low = 0 and price_high = 0)
  ),
  -- Coming-soon services are never bookable and never priced. This is the
  -- gutter-cleaning rule, enforced.
  constraint services_coming_soon_not_bookable check (
    not coming_soon or (not bookable and pricing_model = 'unpriced')
  )
);

-- ── QR codes ──────────────────────────────────────────────────────────────
-- One row per printed flyer batch. `destination` stays re-pointable after
-- print — that is the whole reason flyers carry /go/CODE and never a raw URL.

create table qr_codes (
  code text primary key,
  campaign text not null,
  suburb text,
  destination text not null default '/',
  created_at timestamptz default now()
);

-- ── Events ────────────────────────────────────────────────────────────────
-- The funnel: scans -> landing -> booking started -> booking completed, per
-- printed code. Append-only; nothing edits or deletes these.

create table events (
  id bigserial primary key,
  ts timestamptz default now(),
  type text not null,
  code text references qr_codes(code),
  meta jsonb,
  constraint events_type_known check (
    type in (
      'scan', 'land', 'book_start', 'book_done',
      'call_tap', 'quote_req', 'lead_out_of_area'
    )
  )
);

-- ── Bookings ──────────────────────────────────────────────────────────────

create table bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  status text not null default 'new',
  name text not null,
  phone text not null,
  email text,
  address text not null,
  suburb text not null,
  service_slugs text[] not null,
  -- Size band per size-priced service: {"patio-cleaning": {"band": "medium"}}.
  -- Makes the saved estimate reproducible and feeds jobs.surfaces later.
  service_options jsonb,
  bundle_discount boolean default false,
  est_low int,
  est_high int,
  preferred_date date not null,
  slot text not null,
  notes text,
  photo_urls text[],
  source_code text references qr_codes(code),
  utm jsonb,
  constraint bookings_status_known check (
    status in ('new', 'confirmed', 'done', 'cancelled', 'no_show')
  ),
  constraint bookings_slot_known check (slot in ('am', 'pm')),
  constraint bookings_has_service check (array_length(service_slugs, 1) >= 1)
);

-- ── Availability ──────────────────────────────────────────────────────────
-- Default capacity 2 bookings per half-day, Tue-Sat, plus optional Sun PM at
-- capacity 1. Seeded four weeks ahead in session 3 — an empty table means no
-- bookable slots, which is the safe failure mode.

create table availability (
  day date not null,
  slot text not null,
  capacity int not null default 2,
  primary key (day, slot),
  constraint availability_slot_known check (slot in ('am', 'pm')),
  constraint availability_capacity_sane check (capacity >= 0)
);

-- ── Jobs ──────────────────────────────────────────────────────────────────
-- TRAINING DATA for the Phase-2 quote model. Logged after EVERY job (SPEC
-- §10): the gate to launching instant quotes is 30-50 rows in here.

create table jobs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id),
  done_at date not null,
  address text not null,
  suburb text not null,
  service_slugs text[] not null,
  quoted_low int,
  quoted_high int,
  final_price int not null,
  duration_mins int not null,
  crew_size int default 1,
  surfaces jsonb,
  photo_urls text[],
  notes text,
  constraint jobs_final_price_sane check (final_price >= 0),
  constraint jobs_duration_sane check (duration_mins > 0),
  constraint jobs_crew_sane check (crew_size is null or crew_size > 0)
);

-- One logged job per booking; ad-hoc jobs with no booking are still allowed
-- (multiple NULLs are permitted by a unique index).
create unique index jobs_booking_id_key on jobs (booking_id);

-- ── Quote requests ────────────────────────────────────────────────────────

create table quote_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text,
  phone text not null,
  suburb text,
  description text,
  photo_urls text[],
  source_code text,
  status text default 'new',
  constraint quote_requests_status_known check (
    status in ('new', 'quoted', 'won', 'lost')
  )
);

-- ── Leads ─────────────────────────────────────────────────────────────────
-- People to call who are not bookings. Today that is the out-of-area catch
-- from booking step 2: "We are not in [X] yet - leave your number and we will
-- call if we head that way."
--
-- Deliberately its own table rather than a row in `events`: these are named
-- people with phone numbers and a status the owner works through, and mixing
-- customer PII into an append-only analytics log makes both jobs harder. A
-- `lead_out_of_area` event is still written alongside so the funnel maths is
-- unaffected.
--
-- `suburb` is free text, not a slug - the whole point is that it is a suburb
-- we do not cover, and reading the demand off this table is how the next
-- flyer wave picks up new territory.

create table leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  kind text not null default 'out_of_area',
  name text,
  phone text not null,
  suburb text,
  message text,
  -- No FK: the codes that most often go wrong are exactly the ones attached
  -- to an off-list enquiry, and a lead is never joined for funnel revenue.
  source_code text,
  status text not null default 'new',
  notes text,
  constraint leads_kind_known check (kind in ('out_of_area', 'general')),
  constraint leads_status_known check (
    status in ('new', 'called', 'converted', 'dead')
  )
);

-- ── Service waitlist ──────────────────────────────────────────────────────
-- Demand capture for services not offered yet — gutters first. Storm season
-- (Sept-Nov) fills this; every gutter enquiry lands here, never in bookings.

create table service_waitlist (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  service_slug text not null default 'gutter-cleaning',
  name text,
  phone text not null,
  suburb text,
  source_code text references qr_codes(code),
  notified boolean default false
);

-- ── Unknown QR codes must never fail a write ──────────────────────────────
-- See the header note. Each trigger checks the code against qr_codes; if it
-- is not there, the raw value is kept in the row's jsonb and the FK column is
-- nulled, so the insert always succeeds. `search_path` is pinned because these
-- run on writes made by the service role.

create or replace function public.stash_unknown_booking_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.source_code is not null
     and not exists (select 1 from public.qr_codes q where q.code = new.source_code)
  then
    new.utm := coalesce(new.utm, '{}'::jsonb)
             || jsonb_build_object('unknown_code', new.source_code);
    new.source_code := null;
  end if;
  return new;
end;
$$;

create trigger bookings_stash_unknown_code
  before insert or update of source_code on bookings
  for each row execute function public.stash_unknown_booking_code();

create or replace function public.stash_unknown_event_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.code is not null
     and not exists (select 1 from public.qr_codes q where q.code = new.code)
  then
    new.meta := coalesce(new.meta, '{}'::jsonb)
              || jsonb_build_object('unknown_code', new.code);
    new.code := null;
  end if;
  return new;
end;
$$;

create trigger events_stash_unknown_code
  before insert on events
  for each row execute function public.stash_unknown_event_code();

-- The waitlist has no jsonb column; the raw code is already captured on the
-- scan/land events for that visit, so nulling it here loses nothing.
create or replace function public.null_unknown_waitlist_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.source_code is not null
     and not exists (select 1 from public.qr_codes q where q.code = new.source_code)
  then
    new.source_code := null;
  end if;
  return new;
end;
$$;

create trigger service_waitlist_null_unknown_code
  before insert or update of source_code on service_waitlist
  for each row execute function public.null_unknown_waitlist_code();

-- ── Indexes ───────────────────────────────────────────────────────────────

create index events_ts_idx on events (ts desc);
create index events_type_ts_idx on events (type, ts desc);
create index events_code_idx on events (code) where code is not null;

create index bookings_date_slot_idx on bookings (preferred_date, slot);
create index bookings_status_idx on bookings (status);
create index bookings_created_at_idx on bookings (created_at desc);
create index bookings_source_code_idx on bookings (source_code)
  where source_code is not null;

create index jobs_done_at_idx on jobs (done_at desc);

create index quote_requests_created_at_idx on quote_requests (created_at desc);
create index service_waitlist_created_at_idx on service_waitlist (created_at desc);
create index qr_codes_campaign_idx on qr_codes (campaign);

create index leads_created_at_idx on leads (created_at desc);
create index leads_status_idx on leads (status);
-- Which suburbs keep asking: the input to the next wave's drop plan.
create index leads_suburb_idx on leads (lower(suburb));

-- ── Row level security ────────────────────────────────────────────────────
--
-- SPEC §6: the anon key can do nothing directly. RLS is enabled on every
-- table and no policy grants `anon` anything, so anon reads and writes are
-- denied by default — that is what the session 8 RLS probe checks.
--
-- Public writes go through server actions using the service-role key, which
-- bypasses RLS. Those actions zod-parse every payload first.
--
-- `authenticated` is the single owner account. There is no customer login and
-- there never will be in v1, so authenticated == admin.
--
-- IMPORTANT: turn off public signups in the Supabase dashboard
-- (Authentication -> Providers -> Email -> "Enable signup" off) after creating
-- the owner account. These policies trust any authenticated user.

alter table services enable row level security;
alter table qr_codes enable row level security;
alter table events enable row level security;
alter table bookings enable row level security;
alter table availability enable row level security;
alter table jobs enable row level security;
alter table quote_requests enable row level security;
alter table leads enable row level security;
alter table service_waitlist enable row level security;

-- Catalogue and capacity: admin manages both from /admin.
create policy "admin manages services" on services
  for all to authenticated using (true) with check (true);

create policy "admin manages qr codes" on qr_codes
  for all to authenticated using (true) with check (true);

create policy "admin manages availability" on availability
  for all to authenticated using (true) with check (true);

-- Events are append-only and written by the server. Admin reads the funnel.
create policy "admin reads events" on events
  for select to authenticated using (true);

-- Bookings: admin reads and changes status. Inserts come from the server.
create policy "admin reads bookings" on bookings
  for select to authenticated using (true);

create policy "admin updates bookings" on bookings
  for update to authenticated using (true) with check (true);

-- Jobs: the admin job logger writes these directly.
create policy "admin manages jobs" on jobs
  for all to authenticated using (true) with check (true);

-- Leads: admin reads them and moves their status along.
create policy "admin reads quote requests" on quote_requests
  for select to authenticated using (true);

create policy "admin updates quote requests" on quote_requests
  for update to authenticated using (true) with check (true);

create policy "admin reads leads" on leads
  for select to authenticated using (true);

create policy "admin updates leads" on leads
  for update to authenticated using (true) with check (true);

create policy "admin reads waitlist" on service_waitlist
  for select to authenticated using (true);

create policy "admin updates waitlist" on service_waitlist
  for update to authenticated using (true) with check (true);

-- ── Storage ───────────────────────────────────────────────────────────────
-- Private bucket. Customer photos are pictures of someone's house, so nothing
-- here is world-readable by URL. Uploads go through a server action using the
-- service role; admin views them through the authenticated session or a
-- signed URL. Marketing before/afters are curated separately — only real
-- photos of our own work ever reach the site.

insert into storage.buckets (id, name, public)
values ('job-photos', 'job-photos', false)
on conflict (id) do nothing;

create policy "admin reads job photos" on storage.objects
  for select to authenticated using (bucket_id = 'job-photos');

create policy "admin writes job photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'job-photos');

create policy "admin updates job photos" on storage.objects
  for update to authenticated using (bucket_id = 'job-photos');

create policy "admin deletes job photos" on storage.objects
  for delete to authenticated using (bucket_id = 'job-photos');

-- ── Seed: launch services ─────────────────────────────────────────────────
-- Price anchors from CLAUDE.md. Keep in step with src/data/services.ts.
-- Gutter cleaning is seeded non-bookable, coming-soon and unpriced.

insert into services (
  slug, name, from_price, price_low, price_high, description,
  active, sort, bookable, coming_soon, pricing_model
) values
  (
    'driveway-cleaning',
    'Driveway & concrete cleaning',
    150, 150, 350,
    'Concrete, exposed aggregate and pavers surface-cleaned evenly, edges cut in by hand.',
    true, 1, true, false, 'flat'
  ),
  (
    'house-washing',
    'House soft wash',
    250, 250, 450,
    'Low-pressure soft wash for render, brick and weatherboard. Single storey at launch.',
    true, 2, true, false, 'flat'
  ),
  (
    -- Priced on area: ~$6-8/m2 over a $99 minimum. Bands in src/data/services.ts.
    'patio-cleaning',
    'Patios, paths & pool surrounds',
    99, 99, 400,
    'Entertaining areas, garden paths and pool surrounds, priced on area at a pressure the jointing sand survives.',
    true, 3, true, false, 'banded'
  ),
  (
    -- Priced per linear metre, per side: ~$8-11/lm over a $120 minimum.
    -- Usually sold as the add-on to a house wash.
    'fence-cleaning',
    'Fences & retaining walls',
    120, 120, 450,
    'Colorbond, timber and besser block, priced by the metre. Best value added to a house wash.',
    true, 4, true, false, 'banded'
  ),
  (
    'gutter-cleaning',
    'Gutter cleaning',
    0, 0, 0,
    'Not offered yet. Waitlist only until the owner is qualified for it - no pricing anywhere.',
    true, 5, false, true, 'unpriced'
  )
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
