-- ============================================================
-- Migration 007: Revoke ALL anonymous access
--
--   PREREQUISITE: 006_supabase_auth.sql is applied AND you have
--   verified that logging in from the app works (auth session).
--
--   After this migration the anon key can do exactly one thing:
--   call app_login() is also revoked — login goes through
--   Supabase Auth only. Every table requires a logged-in session.
-- ============================================================

-- ─── Open "allow everything" policies from setup_full.sql ────
DROP POLICY IF EXISTS "Open sites"        ON public.sites;
DROP POLICY IF EXISTS "Open drivers"      ON public.drivers;
DROP POLICY IF EXISTS "Open vehicles"     ON public.vehicles;
DROP POLICY IF EXISTS "Open assets"       ON public.assets;
DROP POLICY IF EXISTS "Open bookings"     ON public.bookings;
DROP POLICY IF EXISTS "Open shifts"       ON public.driver_shifts;
DROP POLICY IF EXISTS "Open plans"        ON public.daily_plans;
DROP POLICY IF EXISTS "Open tracking"     ON public.tracking;
DROP POLICY IF EXISTS "Open trip_events"  ON public.trip_events;
DROP POLICY IF EXISTS "Open job_acc"      ON public.job_acceptances;
DROP POLICY IF EXISTS "Open checklists"   ON public.pre_trip_checklists;
DROP POLICY IF EXISTS "Open epod"         ON public.epod;

-- ─── Anon policies from earlier migrations ────────────────────
DROP POLICY IF EXISTS "allow_all_trips"    ON public.trips;
DROP POLICY IF EXISTS "allow_all_trips_v2" ON public.trips;
DROP POLICY IF EXISTS "anon_read_for_login" ON public.app_users;

-- ─── Stale policies from the original schema.sql (if present) ─
-- These keyed off a custom JWT claim that was never issued.
DROP POLICY IF EXISTS "Admin manage sites"    ON public.sites;
DROP POLICY IF EXISTS "Admin manage drivers"  ON public.drivers;
DROP POLICY IF EXISTS "Admin manage vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Admin manage assets"   ON public.assets;
DROP POLICY IF EXISTS "Admin manage bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admin manage plans"    ON public.daily_plans;
DROP POLICY IF EXISTS "Admin manage shifts"   ON public.driver_shifts;
DROP POLICY IF EXISTS "User read own bookings" ON public.bookings;

-- ─── Login RPC: auth replaces it, anon may not call it ────────
REVOKE EXECUTE ON FUNCTION public.app_login(TEXT, TEXT) FROM anon;

-- ─── Verify lockdown ──────────────────────────────────────────
-- In an incognito window (no session) this must return zero rows
-- or a permission error:
--   curl "https://<project>.supabase.co/rest/v1/trips?select=id" \
--        -H "apikey: <ANON_KEY>"
