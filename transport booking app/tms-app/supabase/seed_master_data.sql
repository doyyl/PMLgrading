-- ============================================================
-- SEED: Master data from Transport_Daily Plan Excel file
-- Run this after schema.sql
-- ============================================================

-- ─── SITES (KNS + Customer On-Site locations) ───────────────
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
  ('MDC1810',     'Thailand', 'MDC Zone 1810',         FALSE)
ON CONFLICT (site_name) DO NOTHING;

-- ─── DRIVERS (from OP codes in the Excel) ───────────────────
-- OP codes from Booking-O sheet historical data
INSERT INTO drivers (employee_id, name, license_type, driver_category, phone, active) VALUES
  ('OP5829', 'Surat',    'ท.4', 'Bulk',    '063-4648619', TRUE),
  ('OP5931', 'Driver 5931', 'ท.3', 'Shuttle', NULL, TRUE),
  ('OP5796', 'Driver 5796', 'ท.3', 'Shuttle', NULL, TRUE),
  ('OP6043', 'Driver 6043', 'ท.3', 'Shuttle', NULL, TRUE),
  ('OP5800', 'Driver 5800', 'ท.3', 'Shuttle', NULL, TRUE),
  ('OP5017', 'Driver 5017', 'ท.3', 'Shuttle', NULL, TRUE),
  ('OP4419', 'Driver 4419', 'ท.3', 'Shuttle', NULL, TRUE),
  ('OP4547', 'Driver 4547', 'ท.4', 'Bulk',    NULL, TRUE),
  ('OP4861', 'Driver 4861', 'ท.4', 'Bulk',    NULL, TRUE),
  ('OP5700', 'EECLINE1 Driver', 'ท.3', 'Shuttle', NULL, TRUE),
  ('OP2422', 'Driver 2422', 'ท.3', 'Shuttle', NULL, TRUE),
  ('OP5983', 'Driver 5983', 'ท.3', 'Shuttle', NULL, TRUE),
  ('OP5952', 'Driver 5952', 'ท.3', 'Shuttle', NULL, TRUE)
ON CONFLICT (employee_id) DO NOTHING;

-- ─── VEHICLES (from Night Shift planning sheet) ──────────────
-- Shuttle fleet (KNS-owned)
INSERT INTO vehicles (plate_number, vehicle_type, ownership, powertrain, active) VALUES
  ('EECLINE-1',  'Shuttle', 'KNS', 'Diesel', TRUE),
  ('EECLINE-4',  'Shuttle', 'KNS', 'Diesel', TRUE),
  ('PAP-2',      'Shuttle', 'KNS', 'Diesel', TRUE),
  ('KNS03',      'Shuttle', 'KNS', 'Diesel', TRUE),
  ('BULK-5',     'Bulk',    'KNS', 'Diesel', TRUE),
  ('BULK-6',     'Bulk',    'KNS', 'Diesel', TRUE),
  ('BULK-7',     'Bulk',    'KNS', 'Diesel', TRUE),
  ('BULK-8',     'Bulk',    'KNS', 'Diesel', TRUE),
  ('BULK-9',     'Bulk',    'KNS', 'Diesel', TRUE),
  ('BULK-10',    'Bulk',    'KNS', 'Diesel', TRUE),
  ('BULK-11',    'Bulk',    'KNS', 'Diesel', TRUE),
  ('BULK-12',    'Bulk',    'KNS', 'Diesel', TRUE),
  ('BULK-13',    'Bulk',    'KNS', 'Diesel', TRUE),
  ('BULK-14',    'Bulk',    'KNS', 'Diesel', TRUE),
  ('BULK-15',    'Bulk',    'KNS', 'Diesel', TRUE),
  ('BULK-16',    'Bulk',    'KNS', 'Diesel', TRUE),
  ('BULK-17',    'Bulk',    'KNS', 'Diesel', TRUE)
ON CONFLICT (plate_number) DO NOTHING;

-- ─── ASSETS (ISO Tanks / Bulk containers) ───────────────────
INSERT INTO assets (asset_id, asset_type, status, last_known_location) VALUES
  ('ISO-TANK-001', 'ISO Tank',  'Empty', 'MDC'),
  ('ISO-TANK-002', 'ISO Tank',  'Empty', 'MDCII'),
  ('ISO-TANK-003', 'ISO Tank',  'Empty', 'TPLC'),
  ('BULK-CTR-001', 'Bulk Container', 'Empty', 'MDC'),
  ('BULK-CTR-002', 'Bulk Container', 'Empty', 'MDCSE'),
  ('TONNER-001',   'Tonner',    'Empty', 'MDC'),
  ('TONNER-002',   'Tonner',    'Empty', 'MDCII')
ON CONFLICT (asset_id) DO NOTHING;
