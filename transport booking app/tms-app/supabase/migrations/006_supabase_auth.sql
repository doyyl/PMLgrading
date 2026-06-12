-- ============================================================
-- Migration 006: Move to Supabase Auth + role-based RLS
--
--   PREREQUISITE: run 005_security_login.sql first (password_hash)
--
--   * Creates a Supabase Auth user for every active app_user
--     (email = "<username>@tms.local", same bcrypt password —
--     existing passwords keep working)
--   * Links app_users.auth_uid → auth.users.id
--   * Helper functions current_app_role() / current_driver_id()
--   * Role-based policies for the `authenticated` role
--
--   The old open/anon policies are NOT removed here, so the app
--   keeps working while you verify auth login. Once login works,
--   run 007_lockdown_anon.sql to revoke anonymous access.
-- ============================================================

-- ─── 1) Create auth users from app_users ─────────────────────
-- GoTrue stores bcrypt in encrypted_password — same format as
-- our crypt(..., gen_salt('bf')) hashes, so they transfer as-is.
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  u.username || '@tms.local',
  u.password_hash,
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('display_name', u.display_name, 'app_role', u.role),
  NOW(), NOW(),
  '', '', '', '', ''
FROM public.app_users u
WHERE u.active
  AND u.password_hash IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM auth.users au WHERE au.email = u.username || '@tms.local'
  );

-- Email identities (required by GoTrue for password login)
INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
SELECT
  gen_random_uuid(), au.id, au.id::text,
  jsonb_build_object('sub', au.id::text, 'email', au.email, 'email_verified', true),
  'email', NULL, NOW(), NOW()
FROM auth.users au
JOIN public.app_users u ON au.email = u.username || '@tms.local'
WHERE NOT EXISTS (
  SELECT 1 FROM auth.identities i WHERE i.user_id = au.id AND i.provider = 'email'
);

-- ─── 2) Link profiles to auth users ───────────────────────────
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS auth_uid UUID UNIQUE;

UPDATE public.app_users u
SET auth_uid = au.id
FROM auth.users au
WHERE au.email = u.username || '@tms.local'
  AND u.auth_uid IS NULL;

-- ─── 3) Role helpers (used inside policies) ───────────────────
CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.app_users
  WHERE auth_uid = auth.uid() AND active
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_driver_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT driver_id FROM public.app_users
  WHERE auth_uid = auth.uid() AND active
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_app_role()  TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_driver_id() TO authenticated;

-- ─── 4) Policies for authenticated users ──────────────────────
-- app_users: each user reads only their own profile row
DROP POLICY IF EXISTS "read_own_profile" ON public.app_users;
CREATE POLICY "read_own_profile" ON public.app_users
  FOR SELECT TO authenticated
  USING (auth_uid = auth.uid());

-- Reference data: everyone logged-in reads; admin/manager manage
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['sites','drivers','vehicles','assets'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "auth_read_%s"   ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "staff_manage_%s" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "auth_read_%s" ON public.%I FOR SELECT TO authenticated USING (true)', t, t);
    EXECUTE format(
      'CREATE POLICY "staff_manage_%s" ON public.%I FOR ALL TO authenticated
         USING (public.current_app_role() IN (''admin'',''manager''))
         WITH CHECK (public.current_app_role() IN (''admin'',''manager''))', t, t);
  END LOOP;
END $$;

-- bookings: read for all logged-in; write for admin/manager
DROP POLICY IF EXISTS "auth_read_bookings"   ON public.bookings;
DROP POLICY IF EXISTS "staff_write_bookings" ON public.bookings;
CREATE POLICY "auth_read_bookings" ON public.bookings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff_write_bookings" ON public.bookings
  FOR ALL TO authenticated
  USING (public.current_app_role() IN ('admin','manager'))
  WITH CHECK (public.current_app_role() IN ('admin','manager'));

-- trips:
--   read   → all logged-in
--   insert/delete → admin/manager
--   update → admin/manager anything;
--            driver only their own trips, or claiming an unassigned
--            trip — but the row must end up owned by that driver
DROP POLICY IF EXISTS "auth_read_trips"    ON public.trips;
DROP POLICY IF EXISTS "staff_insert_trips" ON public.trips;
DROP POLICY IF EXISTS "staff_delete_trips" ON public.trips;
DROP POLICY IF EXISTS "trips_update"       ON public.trips;
CREATE POLICY "auth_read_trips" ON public.trips
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff_insert_trips" ON public.trips
  FOR INSERT TO authenticated
  WITH CHECK (public.current_app_role() IN ('admin','manager'));
CREATE POLICY "staff_delete_trips" ON public.trips
  FOR DELETE TO authenticated
  USING (public.current_app_role() IN ('admin','manager'));
CREATE POLICY "trips_update" ON public.trips
  FOR UPDATE TO authenticated
  USING (
    public.current_app_role() IN ('admin','manager')
    OR driver_id = public.current_driver_id()
    OR (public.current_app_role() = 'driver' AND status = 'unassigned')
  )
  WITH CHECK (
    public.current_app_role() IN ('admin','manager')
    OR driver_id = public.current_driver_id()
  );

-- Operational tables: read for all logged-in; insert allowed for
-- any logged-in user (drivers push tracking/checklists/epod);
-- full manage for admin/manager
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['daily_plans','driver_shifts','tracking','trip_events','job_acceptances','pre_trip_checklists','epod'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP POLICY IF EXISTS "auth_read_%s"   ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_insert_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "staff_manage_%s" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "auth_read_%s" ON public.%I FOR SELECT TO authenticated USING (true)', t, t);
    EXECUTE format(
      'CREATE POLICY "auth_insert_%s" ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', t, t);
    EXECUTE format(
      'CREATE POLICY "staff_manage_%s" ON public.%I FOR ALL TO authenticated
         USING (public.current_app_role() IN (''admin'',''manager''))
         WITH CHECK (public.current_app_role() IN (''admin'',''manager''))', t, t);
  END LOOP;
END $$;

-- ─── 5) Storage: trip-photos bucket for logged-in users ──────
DROP POLICY IF EXISTS "trip_photos_read"   ON storage.objects;
DROP POLICY IF EXISTS "trip_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "trip_photos_update" ON storage.objects;
CREATE POLICY "trip_photos_read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'trip-photos');
CREATE POLICY "trip_photos_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'trip-photos');
CREATE POLICY "trip_photos_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'trip-photos');

-- ─── 6) Verify ────────────────────────────────────────────────
-- Should list every active app_user with a non-null auth_uid:
--   SELECT username, role, auth_uid FROM public.app_users WHERE active;
-- Then log in from the app — it now uses Supabase Auth first.
-- When everything works, run 007_lockdown_anon.sql.
