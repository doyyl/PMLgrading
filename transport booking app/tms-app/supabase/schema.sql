-- ============================================================
-- TMS (Transport Management System) - Full Database Schema
-- Supabase / PostgreSQL DDL
-- ============================================================

-- ─── Extensions ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";  -- for GPS coordinates

-- ─── ENUM TYPES ─────────────────────────────────────────────
CREATE TYPE license_type      AS ENUM ('ท.3', 'ท.4');
CREATE TYPE driver_category   AS ENUM ('Shuttle', 'Bulk');
CREATE TYPE vehicle_type      AS ENUM ('Shuttle', 'Bulk', 'Vanbox');
CREATE TYPE ownership_type    AS ENUM ('KNS', 'Subcontract');
CREATE TYPE powertrain_type   AS ENUM ('Diesel', 'EV');
CREATE TYPE asset_status      AS ENUM ('Empty', 'Loaded', 'In Transit');
CREATE TYPE booking_status    AS ENUM ('Pending', 'Confirmed', 'Cancelled');
CREATE TYPE plan_status       AS ENUM ('Draft', 'Assigned', 'Dispatched', 'Completed', 'Cancelled');
CREATE TYPE trip_status       AS ENUM ('Pending', 'In Progress', 'Completed', 'Incident');
CREATE TYPE shift_type        AS ENUM ('Day', 'Night', 'Off');
CREATE TYPE route_category    AS ENUM ('Subcontract', 'BSM_STYROLUTION', 'Shuttle', 'Bulk', 'Vanbox');
CREATE TYPE cargo_type        AS ENUM ('General', 'Hazardous', 'Chemical', 'BPA', 'ISO_Tank');
CREATE TYPE telematics_event  AS ENUM (
  'Harsh Braking', 'Harsh Acceleration', 'Speeding',
  'Fatigue Alert', 'AI Camera Alert', 'Start Prevent',
  'Geofence Entry', 'Geofence Exit', 'Engine On', 'Engine Off'
);

-- ─── SITES ──────────────────────────────────────────────────
CREATE TABLE sites (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_name         TEXT NOT NULL,
  country           TEXT NOT NULL DEFAULT 'Thailand',
  loading_location  TEXT,
  is_bpa_site       BOOLEAN NOT NULL DEFAULT FALSE,
  latitude          DOUBLE PRECISION,
  longitude         DOUBLE PRECISION,
  address           TEXT,
  contact_name      TEXT,
  contact_phone     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── DRIVERS ────────────────────────────────────────────────
CREATE TABLE drivers (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id           TEXT UNIQUE,
  name                  TEXT NOT NULL,
  license_type          license_type NOT NULL,
  driver_category       driver_category NOT NULL,
  phone                 TEXT,
  email                 TEXT,
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  adr_certificate_expiry DATE,
  license_expiry        DATE,
  photo_url             TEXT,
  home_base_site_id     UUID REFERENCES sites(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── VEHICLES ───────────────────────────────────────────────
CREATE TABLE vehicles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plate_number    TEXT NOT NULL UNIQUE,
  vehicle_type    vehicle_type NOT NULL,
  ownership       ownership_type NOT NULL,
  powertrain      powertrain_type NOT NULL DEFAULT 'Diesel',
  battery_soc     NUMERIC(5,2),              -- % for EV; NULL for Diesel
  range_km        NUMERIC(7,2),              -- estimated range in km
  max_payload_kg  NUMERIC(9,2),
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  gps_device_id   TEXT,
  base_site_id    UUID REFERENCES sites(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ev_soc_check CHECK (
    (powertrain = 'EV' AND battery_soc IS NOT NULL)
    OR powertrain = 'Diesel'
  ),
  CONSTRAINT soc_range CHECK (battery_soc IS NULL OR (battery_soc >= 0 AND battery_soc <= 100))
);

-- ─── ASSETS (ISO Tanks, Tonners, etc.) ──────────────────────
CREATE TABLE assets (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id            TEXT NOT NULL UNIQUE,  -- e.g. "ISO-TANK-001"
  asset_type          TEXT NOT NULL,          -- ISO Tank, Tonner, Container
  status              asset_status NOT NULL DEFAULT 'Empty',
  last_known_location TEXT,
  site_id             UUID REFERENCES sites(id),
  latitude            DOUBLE PRECISION,
  longitude           DOUBLE PRECISION,
  capacity_liters     NUMERIC(10,2),
  tare_weight_kg      NUMERIC(9,2),
  last_updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── BOOKINGS ───────────────────────────────────────────────
CREATE TABLE bookings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_ref     TEXT NOT NULL UNIQUE DEFAULT 'BK-' || to_char(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
  requested_date  DATE NOT NULL,
  site_id         UUID NOT NULL REFERENCES sites(id),
  vehicle_type    vehicle_type NOT NULL,
  cargo_type      cargo_type NOT NULL DEFAULT 'General',
  is_bpa_cargo    BOOLEAN NOT NULL DEFAULT FALSE,
  quantity        NUMERIC(10,2),
  unit            TEXT DEFAULT 'MT',
  notes           TEXT,
  status          booking_status NOT NULL DEFAULT 'Pending',
  requested_by    UUID REFERENCES auth.users(id),
  route_category  route_category,
  origin_site_id  UUID REFERENCES sites(id),
  dest_site_id    UUID REFERENCES sites(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── DRIVER SHIFTS ──────────────────────────────────────────
CREATE TABLE driver_shifts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id   UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  shift_date  DATE NOT NULL,
  shift_type  shift_type NOT NULL DEFAULT 'Day',
  start_time  TIME,
  end_time    TIME,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (driver_id, shift_date)
);

-- ─── DAILY PLANS ────────────────────────────────────────────
CREATE TABLE daily_plans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_date       DATE NOT NULL,
  booking_id      UUID NOT NULL REFERENCES bookings(id),
  driver_id       UUID REFERENCES drivers(id),
  vehicle_id      UUID REFERENCES vehicles(id),
  asset_id        UUID REFERENCES assets(id),
  route_category  route_category NOT NULL,
  status          plan_status NOT NULL DEFAULT 'Draft',
  planned_distance_km  NUMERIC(8,2),
  estimated_co2_saved  NUMERIC(8,2),  -- kg CO2 saved vs diesel (EV trips)
  dispatch_notes  TEXT,
  dispatched_at   TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TRACKING ───────────────────────────────────────────────
CREATE TABLE tracking (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id         UUID NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE,
  trip_status     trip_status NOT NULL DEFAULT 'Pending',
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  speed_kmh       NUMERIC(6,2),
  heading         NUMERIC(5,2),
  altitude_m      NUMERIC(8,2),
  platform_source TEXT NOT NULL DEFAULT 'GPS1',  -- GPS1, GPS2, Manual
  event_type      telematics_event,
  event_detail    JSONB,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TRIP EVENTS (advanced telematics) ─────────────────────
CREATE TABLE trip_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id       UUID NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE,
  event_type    telematics_event NOT NULL,
  severity      TEXT NOT NULL DEFAULT 'Info' CHECK (severity IN ('Info','Warning','Critical')),
  latitude      DOUBLE PRECISION,
  longitude     DOUBLE PRECISION,
  speed_kmh     NUMERIC(6,2),
  description   TEXT,
  media_url     TEXT,        -- AI camera snapshot URL
  acknowledged  BOOLEAN NOT NULL DEFAULT FALSE,
  ack_by        UUID REFERENCES auth.users(id),
  ack_at        TIMESTAMPTZ,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── DRIVER APP: JOB ACCEPTANCE ─────────────────────────────
CREATE TABLE job_acceptances (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id         UUID NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE,
  driver_id       UUID NOT NULL REFERENCES drivers(id),
  accepted        BOOLEAN,
  rejection_reason TEXT,
  responded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── DRIVER APP: PRE-TRIP CHECKLISTS ────────────────────────
CREATE TABLE pre_trip_checklists (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id         UUID NOT NULL REFERENCES daily_plans(id),
  driver_id       UUID NOT NULL REFERENCES drivers(id),
  checklist_data  JSONB NOT NULL DEFAULT '{}',
  -- e.g. {"brakes":true,"lights":true,"tires":true,"fire_extinguisher":true,"adr_docs":true}
  is_complete     BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── DRIVER APP: ePOD ───────────────────────────────────────
CREATE TABLE epod (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id         UUID NOT NULL REFERENCES daily_plans(id),
  driver_id       UUID NOT NULL REFERENCES drivers(id),
  recipient_name  TEXT,
  signature_url   TEXT,        -- signed image URL in Supabase Storage
  photo_urls      JSONB DEFAULT '[]',  -- array of delivery photo URLs
  delivery_notes  TEXT,
  delivered_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ────────────────────────────────────────────────
CREATE INDEX idx_drivers_active           ON drivers(active);
CREATE INDEX idx_drivers_license          ON drivers(license_type);
CREATE INDEX idx_vehicles_active          ON vehicles(active);
CREATE INDEX idx_vehicles_type            ON vehicles(vehicle_type);
CREATE INDEX idx_vehicles_ev              ON vehicles(powertrain) WHERE powertrain = 'EV';
CREATE INDEX idx_assets_status            ON assets(status);
CREATE INDEX idx_assets_site              ON assets(site_id);
CREATE INDEX idx_bookings_date            ON bookings(requested_date);
CREATE INDEX idx_bookings_status          ON bookings(status);
CREATE INDEX idx_bookings_bpa             ON bookings(is_bpa_cargo) WHERE is_bpa_cargo = TRUE;
CREATE INDEX idx_daily_plans_date         ON daily_plans(plan_date);
CREATE INDEX idx_daily_plans_status       ON daily_plans(status);
CREATE INDEX idx_daily_plans_category     ON daily_plans(route_category);
CREATE INDEX idx_driver_shifts_driver     ON driver_shifts(driver_id, shift_date);
CREATE INDEX idx_tracking_plan            ON tracking(plan_id);
CREATE INDEX idx_tracking_recorded        ON tracking(recorded_at DESC);
CREATE INDEX idx_trip_events_plan         ON trip_events(plan_id);
CREATE INDEX idx_trip_events_severity     ON trip_events(severity) WHERE severity IN ('Warning','Critical');

-- ─── UPDATED_AT TRIGGER ─────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sites_updated         BEFORE UPDATE ON sites         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_drivers_updated       BEFORE UPDATE ON drivers       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_vehicles_updated      BEFORE UPDATE ON vehicles      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bookings_updated      BEFORE UPDATE ON bookings      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_daily_plans_updated   BEFORE UPDATE ON daily_plans   FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── VALIDATION TRIGGER: HazMat License + ADR ───────────────
CREATE OR REPLACE FUNCTION validate_plan_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_driver        drivers%ROWTYPE;
  v_booking       bookings%ROWTYPE;
BEGIN
  IF NEW.driver_id IS NULL OR NEW.booking_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_driver  FROM drivers  WHERE id = NEW.driver_id;
  SELECT * INTO v_booking FROM bookings WHERE id = NEW.booking_id;

  -- Rule 1: BPA cargo requires ท.4 license
  IF v_booking.is_bpa_cargo = TRUE AND v_driver.license_type != 'ท.4' THEN
    RAISE EXCEPTION 'HAZMAT_LICENSE_ERROR: Driver % has license % but BPA/Hazardous cargo requires ท.4 license.',
      v_driver.name, v_driver.license_type;
  END IF;

  -- Rule 2: Hazardous/Chemical/BPA cargo requires valid ADR certificate
  IF v_booking.cargo_type IN ('Hazardous', 'Chemical', 'BPA', 'ISO_Tank') THEN
    IF v_driver.adr_certificate_expiry IS NULL THEN
      RAISE EXCEPTION 'ADR_MISSING_ERROR: Driver % has no ADR certificate on file.', v_driver.name;
    END IF;
    IF v_driver.adr_certificate_expiry < CURRENT_DATE THEN
      RAISE EXCEPTION 'ADR_EXPIRED_ERROR: Driver % ADR certificate expired on %.', v_driver.name, v_driver.adr_certificate_expiry;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_plan_assignment
  BEFORE INSERT OR UPDATE ON daily_plans
  FOR EACH ROW EXECUTE FUNCTION validate_plan_assignment();

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────
ALTER TABLE sites               ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_shifts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_plans         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking            ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_acceptances     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_trip_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE epod                ENABLE ROW LEVEL SECURITY;

-- ─── RLS: Authenticated users can read reference data ────────
CREATE POLICY "Authenticated read sites"    ON sites    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read drivers"  ON drivers  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read vehicles" ON vehicles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read assets"   ON assets   FOR SELECT USING (auth.role() = 'authenticated');

-- ─── RLS: Admins/Dispatchers can mutate plans ────────────────
CREATE POLICY "Admin manage sites"    ON sites    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'dispatcher'));
CREATE POLICY "Admin manage drivers"  ON drivers  FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'dispatcher'));
CREATE POLICY "Admin manage vehicles" ON vehicles FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'dispatcher'));
CREATE POLICY "Admin manage assets"   ON assets   FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'dispatcher'));
CREATE POLICY "Admin manage bookings" ON bookings FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'dispatcher'));
CREATE POLICY "Admin manage plans"    ON daily_plans FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'dispatcher'));
CREATE POLICY "Admin manage shifts"   ON driver_shifts FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'dispatcher'));

-- ─── RLS: Bookings — requester can see own bookings ──────────
CREATE POLICY "User read own bookings" ON bookings FOR SELECT USING (requested_by = auth.uid());

-- ─── RLS: Tracking — authenticated can insert/select ────────
CREATE POLICY "Tracking insert" ON tracking FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Tracking select" ON tracking FOR SELECT USING (auth.role() = 'authenticated');

-- ─── RLS: Trip events — authenticated select, admin insert ───
CREATE POLICY "Trip events select" ON trip_events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Trip events insert" ON trip_events FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ─── RLS: Driver app — driver sees own records ───────────────
CREATE POLICY "Driver job acceptance" ON job_acceptances
  FOR ALL USING (driver_id IN (
    SELECT id FROM drivers WHERE employee_id = auth.jwt() ->> 'employee_id'
  ));

CREATE POLICY "Driver checklist" ON pre_trip_checklists
  FOR ALL USING (driver_id IN (
    SELECT id FROM drivers WHERE employee_id = auth.jwt() ->> 'employee_id'
  ));

CREATE POLICY "Driver epod" ON epod
  FOR ALL USING (driver_id IN (
    SELECT id FROM drivers WHERE employee_id = auth.jwt() ->> 'employee_id'
  ));

-- ─── VIEWS ───────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_planning_board AS
SELECT
  dp.id,
  dp.plan_date,
  dp.route_category,
  dp.status,
  dp.planned_distance_km,
  dp.estimated_co2_saved,
  b.booking_ref,
  b.cargo_type,
  b.is_bpa_cargo,
  b.quantity,
  b.unit,
  s.site_name,
  s.is_bpa_site,
  d.name              AS driver_name,
  d.license_type      AS driver_license,
  d.adr_certificate_expiry,
  v.plate_number,
  v.vehicle_type,
  v.powertrain,
  v.battery_soc,
  a.asset_id,
  a.status            AS asset_status,
  a.last_known_location
FROM daily_plans dp
JOIN bookings b     ON b.id = dp.booking_id
JOIN sites s        ON s.id = b.site_id
LEFT JOIN drivers d ON d.id = dp.driver_id
LEFT JOIN vehicles v ON v.id = dp.vehicle_id
LEFT JOIN assets a  ON a.id = dp.asset_id;

-- ─── VIEW: Empty assets for reverse logistics ────────────────
CREATE OR REPLACE VIEW vw_reverse_logistics AS
SELECT
  a.id,
  a.asset_id,
  a.asset_type,
  a.status,
  a.last_known_location,
  a.latitude,
  a.longitude,
  s.site_name,
  s.country,
  s.is_bpa_site,
  a.last_updated_at
FROM assets a
LEFT JOIN sites s ON s.id = a.site_id
WHERE a.status = 'Empty';

-- ─── VIEW: CO2 Sustainability Summary ───────────────────────
CREATE OR REPLACE VIEW vw_sustainability AS
SELECT
  DATE_TRUNC('month', dp.plan_date)::DATE AS month,
  COUNT(*) FILTER (WHERE v.powertrain = 'EV') AS ev_trips,
  COUNT(*) FILTER (WHERE v.powertrain = 'Diesel') AS diesel_trips,
  SUM(dp.planned_distance_km) FILTER (WHERE v.powertrain = 'EV') AS ev_km,
  SUM(dp.estimated_co2_saved) AS total_co2_saved_kg,
  ROUND(SUM(dp.estimated_co2_saved) / 1000, 3) AS total_co2_saved_tonnes
FROM daily_plans dp
LEFT JOIN vehicles v ON v.id = dp.vehicle_id
WHERE dp.status = 'Completed'
GROUP BY 1
ORDER BY 1 DESC;

-- ─── SEED: Sample data ───────────────────────────────────────
INSERT INTO sites (site_name, country, loading_location, is_bpa_site, latitude, longitude) VALUES
  ('Map Ta Phut Industrial Estate', 'Thailand', 'Gate 3 - Chemical Bay', TRUE, 12.6833, 101.1500),
  ('Laem Chabang Port', 'Thailand', 'Terminal B', FALSE, 13.0500, 100.8833),
  ('KNS HQ Bangkok', 'Thailand', 'Main Depot', FALSE, 13.7563, 100.5018),
  ('BASF Rayong', 'Thailand', 'Loading Bay 2', TRUE, 12.7017, 101.2500),
  ('SCG Chemicals Rayong', 'Thailand', 'Dock 4', TRUE, 12.6500, 101.2800);
