-- 0002_availability.sql — working slots for the booking picker
--
-- Tue-Sat AM and PM at capacity 2, plus Sunday PM at capacity 1 as the
-- optional overflow. Monday is off, and Sunday morning never runs: petrol
-- washers are loud and QLD noise expectations push Sunday starts late
-- (CLAUDE.md).
--
-- Written as a function rather than a one-off INSERT because availability has
-- to roll forward. Seed it now, then re-run it whenever you want more runway:
--
--   select ensure_availability(current_date, 12);
--
-- It is idempotent - existing days keep whatever capacity you set by hand, so
-- blocking out a Saturday in admin survives the next top-up.

create or replace function ensure_availability(
  start_day date default current_date,
  weeks int default 8
)
returns int
language plpgsql
set search_path = public
as $$
declare
  d date;
  dow int;
  added int := 0;
begin
  for d in
    select generate_series(start_day, start_day + (weeks * 7), interval '1 day')::date
  loop
    dow := extract(isodow from d);   -- 1 = Monday .. 7 = Sunday

    -- Tuesday to Saturday: both half-days.
    if dow between 2 and 6 then
      insert into availability (day, slot, capacity) values (d, 'am', 2)
        on conflict (day, slot) do nothing;
      added := added + 1;
      insert into availability (day, slot, capacity) values (d, 'pm', 2)
        on conflict (day, slot) do nothing;
      added := added + 1;

    -- Sunday afternoon only, and lighter.
    elsif dow = 7 then
      insert into availability (day, slot, capacity) values (d, 'pm', 1)
        on conflict (day, slot) do nothing;
      added := added + 1;
    end if;
  end loop;

  return added;
end;
$$;

-- Seed the first twelve weeks. SPEC §9 asks for four before launch; twelve
-- means the picker does not quietly run dry a month in.
select ensure_availability(current_date, 12);
