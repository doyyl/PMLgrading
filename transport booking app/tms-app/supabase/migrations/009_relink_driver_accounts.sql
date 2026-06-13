-- ============================================================
-- Migration 009: Re-link driver login accounts to drivers
--
--   FIXES: "insert or update on table \"trips\" violates foreign
--   key constraint trips_driver_id_fkey" when a driver claims /
--   self-assigns a job from the driver app.
--
--   CAUSE: re-running 000_full_setup.sql recreates the `drivers`
--   table with new UUIDs, but the driver accounts in `app_users`
--   used ON CONFLICT DO NOTHING and kept their old driver_id —
--   which no longer exists in `drivers`.
--
--   This re-links each driver account (username = employee_id)
--   to the current drivers row, and nulls any link that is still
--   dangling. Safe to re-run.
--
--   Run in the Supabase SQL Editor.
-- ============================================================

-- 1) Re-link by matching the login username to the driver's employee_id
UPDATE public.app_users u
SET driver_id = d.id
FROM public.drivers d
WHERE u.role = 'driver'
  AND u.username = d.employee_id
  AND u.driver_id IS DISTINCT FROM d.id;

-- 2) Null out any driver_id that still points to a non-existent driver
UPDATE public.app_users u
SET driver_id = NULL
WHERE u.driver_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = u.driver_id);

-- 3) Verify — every driver account should now have a valid driver_id:
--   SELECT u.username, u.driver_id, d.employee_id, d.name
--   FROM public.app_users u
--   LEFT JOIN public.drivers d ON d.id = u.driver_id
--   WHERE u.role = 'driver'
--   ORDER BY u.username;
--
-- NOTE: drivers who are already logged in must log out and log back
-- in so the app picks up the corrected driver_id.
