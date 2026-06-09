-- ============================================================
-- SEED: Historical booking data from Transport_Daily Plan Excel
-- DataBase sheet + Booking-O sheet (dates: 2026-05-26 to 2026-06-09)
-- ============================================================

DO $$
DECLARE
  v_site_id UUID;
  v_booking_id UUID;
BEGIN

-- Helper: get site id
-- We use a local function approach via subquery

-- ─── 2026-05-26 (Excel serial 46167) ────────────────────────
-- MDCSE → DOWSE → MDC1586
INSERT INTO bookings (booking_ref, requested_date, site_id, vehicle_type, cargo_type,
  is_bpa_cargo, quantity, unit, notes, status, route_category)
SELECT
  'BK-20260526-0001', '2026-05-26'::DATE,
  s.id, 'Shuttle'::vehicle_type, 'Chemical'::cargo_type,
  FALSE, 2, 'trips', NULL, 'Confirmed'::booking_status, 'Shuttle'::route_category
FROM sites s WHERE s.site_name = 'MDCSE' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bookings (booking_ref, requested_date, site_id, vehicle_type, cargo_type,
  is_bpa_cargo, quantity, unit, notes, status, route_category)
SELECT
  'BK-20260526-0002', '2026-05-26'::DATE,
  s.id, 'Shuttle'::vehicle_type, 'Chemical'::cargo_type,
  FALSE, 1, 'trips', NULL, 'Confirmed'::booking_status, 'Shuttle'::route_category
FROM sites s WHERE s.site_name = 'IPI On-Site' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bookings (booking_ref, requested_date, site_id, vehicle_type, cargo_type,
  is_bpa_cargo, quantity, unit, notes, status, route_category)
SELECT
  'BK-20260526-0003', '2026-05-26'::DATE,
  s.id, 'Shuttle'::vehicle_type, 'Chemical'::cargo_type,
  FALSE, 14, 'trips', 'solvay ตัดรถ', 'Confirmed'::booking_status, 'Shuttle'::route_category
FROM sites s WHERE s.site_name = 'MDC' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bookings (booking_ref, requested_date, site_id, vehicle_type, cargo_type,
  is_bpa_cargo, quantity, unit, notes, status, route_category)
SELECT
  'BK-20260526-0004', '2026-05-26'::DATE,
  s.id, 'Shuttle'::vehicle_type, 'BPA'::cargo_type,
  TRUE, 1, 'trips', NULL, 'Confirmed'::booking_status, 'BSM_STYROLUTION'::route_category
FROM sites s WHERE s.site_name = 'COV On-site' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bookings (booking_ref, requested_date, site_id, vehicle_type, cargo_type,
  is_bpa_cargo, quantity, unit, notes, status, route_category)
SELECT
  'BK-20260526-0005', '2026-05-26'::DATE,
  s.id, 'Shuttle'::vehicle_type, 'BPA'::cargo_type,
  TRUE, 4, 'trips', '*เที่ยวสุดท้ายก่อน 23:00', 'Confirmed'::booking_status, 'BSM_STYROLUTION'::route_category
FROM sites s WHERE s.site_name = 'MDCII' LIMIT 1
ON CONFLICT DO NOTHING;

-- ─── 2026-05-27 (Excel serial 46168) ────────────────────────
INSERT INTO bookings (booking_ref, requested_date, site_id, vehicle_type, cargo_type,
  is_bpa_cargo, quantity, unit, notes, status, route_category)
SELECT
  'BK-20260527-0001', '2026-05-27'::DATE,
  s.id, 'Shuttle'::vehicle_type, 'Chemical'::cargo_type,
  FALSE, 2, 'trips', NULL, 'Completed'::booking_status, 'Shuttle'::route_category
FROM sites s WHERE s.site_name = 'MDCII' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bookings (booking_ref, requested_date, site_id, vehicle_type, cargo_type,
  is_bpa_cargo, quantity, unit, notes, status, route_category)
SELECT
  'BK-20260527-0002', '2026-05-27'::DATE,
  s.id, 'Shuttle'::vehicle_type, 'Chemical'::cargo_type,
  FALSE, 26, 'trips', 'เที่ยวแรกไม่เกิน 9:00น.', 'Completed'::booking_status, 'Shuttle'::route_category
FROM sites s WHERE s.site_name = 'MDCII' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bookings (booking_ref, requested_date, site_id, vehicle_type, cargo_type,
  is_bpa_cargo, quantity, unit, notes, status, route_category)
SELECT
  'BK-20260527-0003', '2026-05-27'::DATE,
  s.id, 'Bulk'::vehicle_type, 'Chemical'::cargo_type,
  FALSE, 2, 'trips', NULL, 'Completed'::booking_status, 'Bulk'::route_category
FROM sites s WHERE s.site_name = 'MDCII' LIMIT 1
ON CONFLICT DO NOTHING;

-- ─── 2026-06-09 (Excel serial 46182) ────────────────────────
INSERT INTO bookings (booking_ref, requested_date, site_id, vehicle_type, cargo_type,
  is_bpa_cargo, quantity, unit, notes, status, route_category)
SELECT
  'BK-20260609-' || LPAD(ROW_NUMBER() OVER ()::TEXT, 4, '0'),
  '2026-06-09'::DATE,
  s.id,
  CASE t.vtype WHEN 'Bulk Truck' THEN 'Bulk'::vehicle_type ELSE 'Shuttle'::vehicle_type END,
  t.ctype::cargo_type,
  t.bpa,
  t.trips, 'trips',
  t.remark,
  'Confirmed'::booking_status,
  CASE t.vtype WHEN 'Bulk Truck' THEN 'Bulk'::route_category ELSE 'Shuttle'::route_category END
FROM (VALUES
  ('MDCII',      'MAKROFOL',   'Transfer',   'Dock loading',   'Chemical',  FALSE, 2,  NULL),
  ('MDCII',      'HMC',        'Bulk Truck',  'Bulk Truck',    'Chemical',  FALSE, 2,  NULL),
  ('MDC',        'BEE',        'Transfer',   'Side Loading',   'General',   FALSE, 20, NULL),
  ('MDC',        'SOLVAYTHAI', 'Transfer',   'Side Loading',   'Chemical',  FALSE, 1,  NULL),
  ('COV On-site','BMSCPD',     'Transfer',   'Dock loading',   'BPA',       TRUE,  1,  NULL),
  ('COV On-site','BMSCPD',     'Transfer',   'Dock loading',   'BPA',       TRUE,  6,  'ค้างย้าย 2 เที่ยว'),
  ('MDC',        'BMSCPD',     'Transfer',   'Dock loading',   'BPA',       TRUE,  2,  NULL),
  ('MDCII',      'MAKROFOL',   'Transfer',   'Side Loading',   'Chemical',  FALSE, 2,  NULL),
  ('MDC',        'STYROLUTION','Transfer',   'Dock loading',   'Chemical',  TRUE,  1,  NULL),
  ('AVT On-Site','AVT',        'Transfer',   '40HQ',           'Chemical',  FALSE, 20, 'เอารถไปช่วยวิ่งซากุระ'),
  ('AVT On-Site','AVTSAKURA',  'Transfer',   '40HQ',           'Chemical',  FALSE, 25, NULL),
  ('IPI On-Site','IPI',        'Transfer',   'Dock loading',   'Chemical',  FALSE, 5,  NULL),
  ('MDCII',      'HMC',        'Transfer',   'Side Loading',   'Chemical',  FALSE, 13, NULL)
) AS t(site_name, customer, activity, vtype, ctype, bpa, trips, remark)
JOIN sites s ON s.site_name = t.site_name
ON CONFLICT DO NOTHING;

END $$;
