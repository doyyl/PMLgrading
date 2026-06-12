-- Migration 003: Rebuild trips table (booking_id instead of plan_id)
-- Run in Supabase SQL Editor

DROP TABLE IF EXISTS public.trips CASCADE;

CREATE TABLE public.trips (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id      UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  driver_id       UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  vehicle_id      UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  trip_number     INT  NOT NULL DEFAULT 1,
  scheduled_date  DATE,
  customer        TEXT,
  loading_place   TEXT,
  destination     TEXT,
  cargo_notes     TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  close_photo_url TEXT,
  status          TEXT NOT NULL DEFAULT 'unassigned'
                  CHECK (status IN ('unassigned','assigned','in_progress','completed','cancelled')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_trips_v2" ON public.trips
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_trips_booking ON public.trips(booking_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver  ON public.trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_status  ON public.trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_date    ON public.trips(scheduled_date);
