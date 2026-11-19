-- 0006: driveway size, counted in cars (owner's call, 19 Nov 2026).
--
-- Replaces "up to 60 m2, then $4 per extra m2": nobody knows their driveway
-- in square metres, but everyone knows how many cars fit on it. Prices are
-- in pricing.json; this only records what the customer picked so the owner
-- knows what they are walking into. Null when the job has no driveway.

alter table bookings
  add column if not exists driveway_size text;

alter table bookings
  drop constraint if exists bookings_driveway_size_known;

alter table bookings
  add constraint bookings_driveway_size_known check (
    driveway_size is null
    or driveway_size in ('1-2-cars', '3-cars', '4-cars', 'bigger')
  );
