-- 0005: let the website's server write to the tables.
--
-- Projects created from late 2026 no longer grant table privileges to the API
-- roles automatically. Without this, service_role (which every server action
-- uses: bookings, leads, events) gets "permission denied" and every booking
-- shows the "call us" fallback.
--
-- service_role only. anon and authenticated stay ungranted on purpose: the
-- public reads nothing and writes only through server actions. RLS policies
-- still apply on top for any role that is granted later.

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Tables and sequences added by later migrations get the same.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
