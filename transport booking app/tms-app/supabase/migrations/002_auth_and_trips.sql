-- ============================================================
-- Migration 002: App Users (login) + Trips (per-trip tracking)
-- Run in Supabase SQL Editor
-- ============================================================

-- ─── APP USERS (login credentials) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.app_users (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username     TEXT UNIQUE NOT NULL,
  password     TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('admin', 'driver', 'manager')),
  driver_id    UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  active       BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
-- Allow anon to read for login query (compare username+password client-side)
CREATE POLICY "anon_read_for_login" ON public.app_users
  FOR SELECT TO anon USING (true);

-- ─── TRIPS (individual trip records within a plan) ───────────
CREATE TABLE IF NOT EXISTS public.trips (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id         UUID NOT NULL REFERENCES public.daily_plans(id) ON DELETE CASCADE,
  driver_id       UUID NOT NULL REFERENCES public.drivers(id),
  trip_number     INT  NOT NULL DEFAULT 1,
  destination     TEXT,
  customer        TEXT,
  cargo_notes     TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  close_photo_url TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_trips" ON public.trips
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_trips_plan     ON public.trips(plan_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver   ON public.trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_status   ON public.trips(status);

-- ─── DEFAULT ACCOUNTS ────────────────────────────────────────
-- Change passwords after first login!
INSERT INTO public.app_users (username, password, role, display_name) VALUES
  ('admin',   'admin1234',   'admin',   'Admin Dispatcher'),
  ('manager', 'manager1234', 'manager', 'System Manager')
ON CONFLICT (username) DO NOTHING;

-- To add a driver account, run:
-- INSERT INTO public.app_users (username, password, role, driver_id, display_name)
-- VALUES ('driver01', 'pass1234', 'driver', '<driver UUID from drivers table>', 'ชื่อ พขร.');

-- ─── STORAGE BUCKET (manual step) ───────────────────────────
-- Go to Supabase Dashboard → Storage → New Bucket
-- Name: trip-photos
-- Public: YES
-- Then add policy: allow anon INSERT and SELECT
