-- ============================================================
-- Migration 008: Trip issues — driver "report a problem"
--
--   Drivers report an issue on one of their trips (type + note +
--   optional photo). Staff (admin/manager) see and resolve them.
--
--   Run this once in the Supabase SQL Editor, on top of your
--   existing schema (000_full_setup.sql / 002–006).
--   Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.trip_issues (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id     UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  driver_id   UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  issue_type  TEXT NOT NULL,
  description TEXT,
  photo_url   TEXT,
  status      TEXT NOT NULL DEFAULT 'open'
              CHECK (status IN ('open', 'acknowledged', 'resolved')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_trip_issues_trip   ON public.trip_issues(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_issues_status ON public.trip_issues(status);

ALTER TABLE public.trip_issues ENABLE ROW LEVEL SECURITY;

-- read: any logged-in user · insert: any logged-in (drivers report)
-- manage (resolve / delete): admin or manager only
DROP POLICY IF EXISTS "auth_read_trip_issues"    ON public.trip_issues;
DROP POLICY IF EXISTS "auth_insert_trip_issues"  ON public.trip_issues;
DROP POLICY IF EXISTS "staff_manage_trip_issues" ON public.trip_issues;
CREATE POLICY "auth_read_trip_issues" ON public.trip_issues
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_trip_issues" ON public.trip_issues
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "staff_manage_trip_issues" ON public.trip_issues
  FOR ALL TO authenticated
  USING (public.current_app_role() IN ('admin', 'manager'))
  WITH CHECK (public.current_app_role() IN ('admin', 'manager'));
