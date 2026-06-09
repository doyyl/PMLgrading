-- ============================================================
-- TMS Full Setup — Run this once in the Supabase SQL Editor
-- https://supabase.com/dashboard/project/dvshvndpjmvpmjfxvcxw/sql
-- ============================================================

-- ─── Extensions ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Drop existing objects (safe re-run) ────────────────────
DROP TABLE IF EXISTS epod                  CASCADE;
DROP TABLE IF EXISTS pre_trip_checklists   CASCADE;
DROP TABLE IF EXISTS job_acceptances       CASCADE;
DROP TABLE IF EXISTS trip_events           CASCADE;
DROP TABLE IF EXISTS tracking              CASCADE;
DROP TABLE IF EXISTS daily_plans           CASCADE;
DROP TABLE IF EXISTS driver_shifts         CASCADE;
DROP TABLE IF EXISTS bookings              CASCADE;
DROP TABLE IF EXISTS assets                CASCADE;
DROP TABLE IF EXISTS vehicles              CASCADE;
DROP TABLE IF EXISTS drivers               CASCADE;
DROP TABLE IF EXISTS sites                 CASCADE;

DROP TYPE IF EXISTS license_type      CASCADE;
DROP TYPE IF EXISTS driver_category   CASCADE;
DROP TYPE IF EXISTS vehicle_type      CASCADE;
DROP TYPE IF EXISTS ownership_type    CASCADE;
DROP TYPE IF EXISTS powertrain_type   CASCADE;
DROP TYPE IF EXISTS asset_status      CASCADE;
DROP TYPE IF EXISTS booking_status    CASCADE;
DROP TYPE IF EXISTS plan_status       CASCADE;
DROP TYPE IF EXISTS trip_status       CASCADE;
DROP TYPE IF EXISTS shift_type        CASCADE;
DROP TYPE IF EXISTS route_category    CASCADE;
DROP TYPE IF EXISTS cargo_type        CASCADE;
DROP TYPE IF EXISTS telematics_event  CASCADE;

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
  site_name         TEXT NOT NULL UNIQUE,
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
  battery_soc     NUMERIC(5,2),
  range_km        NUMERIC(7,2),
  max_payload_kg  NUMERIC(9,2),
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  gps_device_id   TEXT,
  base_site_id    UUID REFERENCES sites(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT soc_range CHECK (battery_soc IS NULL OR (battery_soc >= 0 AND battery_soc <= 100))
);

-- ─── ASSETS ─────────────────────────────────────────────────
CREATE TABLE assets (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id            TEXT NOT NULL UNIQUE,
  asset_type          TEXT NOT NULL,
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
  unit            TEXT DEFAULT 'trips',
  notes           TEXT,
  status          booking_status NOT NULL DEFAULT 'Pending',
  requested_by    UUID,
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
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_date            DATE NOT NULL,
  booking_id           UUID NOT NULL REFERENCES bookings(id),
  driver_id            UUID REFERENCES drivers(id),
  vehicle_id           UUID REFERENCES vehicles(id),
  asset_id             UUID REFERENCES assets(id),
  route_category       route_category NOT NULL,
  status               plan_status NOT NULL DEFAULT 'Draft',
  planned_distance_km  NUMERIC(8,2),
  estimated_co2_saved  NUMERIC(8,2),
  dispatch_notes       TEXT,
  dispatched_at        TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  created_by           UUID,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  platform_source TEXT NOT NULL DEFAULT 'GPS1',
  event_type      telematics_event,
  event_detail    JSONB,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TRIP EVENTS ────────────────────────────────────────────
CREATE TABLE trip_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id       UUID NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE,
  event_type    telematics_event NOT NULL,
  severity      TEXT NOT NULL DEFAULT 'Info' CHECK (severity IN ('Info','Warning','Critical')),
  latitude      DOUBLE PRECISION,
  longitude     DOUBLE PRECISION,
  speed_kmh     NUMERIC(6,2),
  description   TEXT,
  media_url     TEXT,
  acknowledged  BOOLEAN NOT NULL DEFAULT FALSE,
  ack_by        UUID,
  ack_at        TIMESTAMPTZ,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── DRIVER APP TABLES ───────────────────────────────────────
CREATE TABLE job_acceptances (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id          UUID NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE,
  driver_id        UUID NOT NULL REFERENCES drivers(id),
  accepted         BOOLEAN,
  rejection_reason TEXT,
  responded_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pre_trip_checklists (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id         UUID NOT NULL REFERENCES daily_plans(id),
  driver_id       UUID NOT NULL REFERENCES drivers(id),
  checklist_data  JSONB NOT NULL DEFAULT '{}',
  is_complete     BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE epod (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id         UUID NOT NULL REFERENCES daily_plans(id),
  driver_id       UUID NOT NULL REFERENCES drivers(id),
  recipient_name  TEXT,
  signature_url   TEXT,
  photo_urls      JSONB DEFAULT '[]',
  delivery_notes  TEXT,
  delivered_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ────────────────────────────────────────────────
CREATE INDEX idx_drivers_active      ON drivers(active);
CREATE INDEX idx_vehicles_active     ON vehicles(active);
CREATE INDEX idx_bookings_date       ON bookings(requested_date);
CREATE INDEX idx_bookings_status     ON bookings(status);
CREATE INDEX idx_daily_plans_date    ON daily_plans(plan_date);
CREATE INDEX idx_daily_plans_status  ON daily_plans(status);
CREATE INDEX idx_daily_plans_cat     ON daily_plans(route_category);
CREATE INDEX idx_trip_events_plan    ON trip_events(plan_id);
CREATE INDEX idx_tracking_plan       ON tracking(plan_id);

-- ─── UPDATED_AT TRIGGER ─────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sites_updated       BEFORE UPDATE ON sites       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_drivers_updated     BEFORE UPDATE ON drivers     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_vehicles_updated    BEFORE UPDATE ON vehicles    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bookings_updated    BEFORE UPDATE ON bookings    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_daily_plans_updated BEFORE UPDATE ON daily_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── HAZMAT VALIDATION TRIGGER ──────────────────────────────
CREATE OR REPLACE FUNCTION validate_plan_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_driver  drivers%ROWTYPE;
  v_booking bookings%ROWTYPE;
BEGIN
  IF NEW.driver_id IS NULL OR NEW.booking_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO v_driver  FROM drivers  WHERE id = NEW.driver_id;
  SELECT * INTO v_booking FROM bookings WHERE id = NEW.booking_id;

  IF v_booking.is_bpa_cargo = TRUE AND v_driver.license_type != 'ท.4' THEN
    RAISE EXCEPTION 'HAZMAT_LICENSE_ERROR: Driver % has license % but BPA cargo requires ท.4.', v_driver.name, v_driver.license_type;
  END IF;
  IF v_booking.cargo_type IN ('Hazardous', 'Chemical', 'BPA', 'ISO_Tank') THEN
    IF v_driver.adr_certificate_expiry IS NULL THEN
      RAISE EXCEPTION 'ADR_MISSING_ERROR: Driver % has no ADR certificate.', v_driver.name;
    END IF;
    IF v_driver.adr_certificate_expiry < CURRENT_DATE THEN
      RAISE EXCEPTION 'ADR_EXPIRED_ERROR: Driver % ADR expired on %.', v_driver.name, v_driver.adr_certificate_expiry;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_plan
  BEFORE INSERT OR UPDATE ON daily_plans
  FOR EACH ROW EXECUTE FUNCTION validate_plan_assignment();

-- ─── VIEWS ───────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_planning_board AS
SELECT
  dp.id, dp.plan_date, dp.route_category, dp.status,
  dp.planned_distance_km, dp.estimated_co2_saved, dp.dispatch_notes,
  b.booking_ref, b.cargo_type, b.is_bpa_cargo, b.quantity, b.unit,
  s.site_name, s.is_bpa_site,
  d.name              AS driver_name,
  d.license_type      AS driver_license,
  d.adr_certificate_expiry,
  v.plate_number, v.vehicle_type, v.powertrain, v.battery_soc,
  a.asset_id, a.status AS asset_status, a.last_known_location
FROM daily_plans dp
JOIN  bookings b  ON b.id = dp.booking_id
JOIN  sites s     ON s.id = b.site_id
LEFT JOIN drivers  d ON d.id = dp.driver_id
LEFT JOIN vehicles v ON v.id = dp.vehicle_id
LEFT JOIN assets   a ON a.id = dp.asset_id;

CREATE OR REPLACE VIEW vw_reverse_logistics AS
SELECT a.id, a.asset_id, a.asset_type, a.status, a.last_known_location,
  a.latitude, a.longitude, s.site_name, s.country, s.is_bpa_site, a.last_updated_at
FROM assets a
LEFT JOIN sites s ON s.id = a.site_id
WHERE a.status = 'Empty';

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
GROUP BY 1 ORDER BY 1 DESC;

-- ─── ROW LEVEL SECURITY — Open access (no auth required) ────
-- All tables: allow full access from the anon key
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

CREATE POLICY "Open sites"        ON sites               FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Open drivers"      ON drivers             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Open vehicles"     ON vehicles            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Open assets"       ON assets              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Open bookings"     ON bookings            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Open shifts"       ON driver_shifts       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Open plans"        ON daily_plans         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Open tracking"     ON tracking            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Open trip_events"  ON trip_events         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Open job_acc"      ON job_acceptances     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Open checklists"   ON pre_trip_checklists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Open epod"         ON epod                FOR ALL USING (true) WITH CHECK (true);

-- ─── MASTER DATA SEED ────────────────────────────────────────
INSERT INTO sites (site_name, country, loading_location, is_bpa_site) VALUES
  ('MDC',         'Thailand', 'MDC Main Gate',        FALSE),
  ('MDCII',       'Thailand', 'MDCII Bay',             FALSE),
  ('MDCSE',       'Thailand', 'MDCSE Loading Dock',    FALSE),
  ('TPLC',        'Thailand', 'TPLC Warehouse',        TRUE),
  ('AVT On-Site', 'Thailand', 'AVT Loading Area',      FALSE),
  ('COV On-site', 'Thailand', 'COV Loading Dock',      TRUE),
  ('IPI On-Site', 'Thailand', 'IPI Terminal',          FALSE),
  ('BEE',         'Thailand', 'BEE Dock',              FALSE),
  ('BMSCPD',      'Thailand', 'BMSCPD Loading Bay',    TRUE),
  ('HMC',         'Thailand', 'HMC Dock',              FALSE),
  ('IPI',         'Thailand', 'IPI Warehouse',         FALSE),
  ('IPIBICO',     'Thailand', 'IPIBICO Area',          FALSE),
  ('IPICHIP',     'Thailand', 'IPICHIP Bay',           FALSE),
  ('MAKROFOL',    'Thailand', 'MAKROFOL Gate',         FALSE),
  ('SOLVAY',      'Thailand', 'SOLVAY Dock',           FALSE),
  ('SOLVAYTHAI',  'Thailand', 'SOLVAYTHAI Loading',    FALSE),
  ('STYROLUTION', 'Thailand', 'STYROLUTION Bay',       TRUE),
  ('Vexcel',      'Thailand', 'Vexcel Terminal',       FALSE),
  ('OPM',         'Thailand', 'OPM Site',              FALSE),
  ('BMSBPA',      'Thailand', 'BMSBPA Dock',           TRUE),
  ('MDC1586',     'Thailand', 'MDC Zone 1586',         FALSE),
  ('MDC1810',     'Thailand', 'MDC Zone 1810',         FALSE),
  ('AVT',         'Thailand', 'AVT Main',              FALSE),
  ('AVTSAKURA',   'Thailand', 'AVT Sakura',            FALSE),
  ('DOWSE',       'Thailand', 'DOWSE Site',            FALSE),
  ('BMSCPDRM',    'Thailand', 'BMSCPDRM Bay',          TRUE)
ON CONFLICT (site_name) DO NOTHING;

INSERT INTO drivers (employee_id, name, license_type, driver_category, phone, active, adr_certificate_expiry) VALUES
  ('OP5829', 'Surat',          'ท.4', 'Bulk',    '063-4648619', TRUE, '2026-12-31'),
  ('OP5931', 'Driver OP5931',  'ท.3', 'Shuttle', NULL,          TRUE, NULL),
  ('OP5796', 'Driver OP5796',  'ท.3', 'Shuttle', NULL,          TRUE, NULL),
  ('OP6043', 'Driver OP6043',  'ท.3', 'Shuttle', NULL,          TRUE, NULL),
  ('OP5800', 'Driver OP5800',  'ท.3', 'Shuttle', NULL,          TRUE, NULL),
  ('OP5017', 'Driver OP5017',  'ท.3', 'Shuttle', NULL,          TRUE, NULL),
  ('OP4419', 'Driver OP4419',  'ท.3', 'Shuttle', NULL,          TRUE, NULL),
  ('OP4547', 'Driver OP4547',  'ท.4', 'Bulk',    NULL,          TRUE, '2026-06-30'),
  ('OP4861', 'Driver OP4861',  'ท.4', 'Bulk',    NULL,          TRUE, '2026-09-30'),
  ('OP5700', 'EECLINE1 Driver','ท.3', 'Shuttle', NULL,          TRUE, NULL),
  ('OP2422', 'Driver OP2422',  'ท.3', 'Shuttle', NULL,          TRUE, NULL),
  ('OP5983', 'Driver OP5983',  'ท.3', 'Shuttle', NULL,          TRUE, NULL),
  ('OP5952', 'Driver OP5952',  'ท.3', 'Shuttle', NULL,          TRUE, NULL)
ON CONFLICT (employee_id) DO NOTHING;

INSERT INTO vehicles (plate_number, vehicle_type, ownership, powertrain, active) VALUES
  ('EECLINE-1', 'Shuttle', 'KNS', 'Diesel', TRUE),
  ('EECLINE-4', 'Shuttle', 'KNS', 'Diesel', TRUE),
  ('PAP-2',     'Shuttle', 'KNS', 'Diesel', TRUE),
  ('KNS03',     'Shuttle', 'KNS', 'Diesel', TRUE),
  ('BULK-5',    'Bulk',    'KNS', 'Diesel', TRUE),
  ('BULK-6',    'Bulk',    'KNS', 'Diesel', TRUE),
  ('BULK-7',    'Bulk',    'KNS', 'Diesel', TRUE),
  ('BULK-8',    'Bulk',    'KNS', 'Diesel', TRUE),
  ('BULK-9',    'Bulk',    'KNS', 'Diesel', TRUE),
  ('BULK-10',   'Bulk',    'KNS', 'Diesel', TRUE),
  ('BULK-11',   'Bulk',    'KNS', 'Diesel', TRUE),
  ('BULK-12',   'Bulk',    'KNS', 'Diesel', TRUE),
  ('BULK-13',   'Bulk',    'KNS', 'Diesel', TRUE),
  ('BULK-14',   'Bulk',    'KNS', 'Diesel', TRUE),
  ('BULK-15',   'Bulk',    'KNS', 'Diesel', TRUE),
  ('BULK-16',   'Bulk',    'KNS', 'Diesel', TRUE),
  ('BULK-17',   'Bulk',    'KNS', 'Diesel', TRUE)
ON CONFLICT (plate_number) DO NOTHING;

INSERT INTO assets (asset_id, asset_type, status, last_known_location) VALUES
  ('ISO-TANK-001', 'ISO Tank',       'Empty', 'MDC'),
  ('ISO-TANK-002', 'ISO Tank',       'Empty', 'MDCII'),
  ('ISO-TANK-003', 'ISO Tank',       'Empty', 'TPLC'),
  ('BULK-CTR-001', 'Bulk Container', 'Empty', 'MDC'),
  ('BULK-CTR-002', 'Bulk Container', 'Empty', 'MDCSE'),
  ('TONNER-001',   'Tonner',         'Empty', 'MDC'),
  ('TONNER-002',   'Tonner',         'Empty', 'MDCII')
ON CONFLICT (asset_id) DO NOTHING;
