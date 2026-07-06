-- ============================================================
-- Migration 014: Fuel logs — driver refueling with odometer + slip
--
--   A driver opens a fuel record by entering the odometer reading
--   BEFORE fueling (status='open'), then closes it after fueling by
--   uploading a photo of the pump slip (status='closed'). The record
--   cannot be closed without the slip photo.
--
--   Standalone vehicle event: keyed by driver_id + vehicle_id, with
--   an OPTIONAL trip_id link (fuel may happen between trips).
--
--   Run once in the Supabase SQL Editor, on top of the existing
--   schema (000_full_setup.sql / 002–013). Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fuel_logs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id      UUID REFERENCES public.drivers(id)  ON DELETE SET NULL,
  vehicle_id     UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  trip_id        UUID REFERENCES public.trips(id)    ON DELETE SET NULL,
  odometer_km    INTEGER NOT NULL CHECK (odometer_km > 0),  -- captured before fueling
  liters         NUMERIC(7,2) CHECK (liters IS NULL OR liters >= 0),
  total_baht     NUMERIC(10,2) CHECK (total_baht IS NULL OR total_baht >= 0),
  station        TEXT,
  note           TEXT,
  slip_photo_url TEXT,                                       -- required to close
  status         TEXT NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'closed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at      TIMESTAMPTZ,
  -- a closed record must have a slip photo
  CONSTRAINT fuel_closed_needs_slip
    CHECK (status = 'open' OR slip_photo_url IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_fuel_logs_driver  ON public.fuel_logs(driver_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle ON public.fuel_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_status  ON public.fuel_logs(status);

ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;

-- read: any logged-in user · insert + update: any logged-in (driver opens & closes own)
-- manage (delete) + future read-only reporting: admin or manager
DROP POLICY IF EXISTS "auth_read_fuel_logs"    ON public.fuel_logs;
DROP POLICY IF EXISTS "auth_insert_fuel_logs"  ON public.fuel_logs;
DROP POLICY IF EXISTS "auth_update_fuel_logs"  ON public.fuel_logs;
DROP POLICY IF EXISTS "staff_manage_fuel_logs" ON public.fuel_logs;
CREATE POLICY "auth_read_fuel_logs" ON public.fuel_logs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_fuel_logs" ON public.fuel_logs
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_fuel_logs" ON public.fuel_logs
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_manage_fuel_logs" ON public.fuel_logs
  FOR ALL TO authenticated
  USING (public.current_app_role() IN ('admin', 'manager'))
  WITH CHECK (public.current_app_role() IN ('admin', 'manager'));
