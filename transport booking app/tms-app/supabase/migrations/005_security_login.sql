-- ============================================================
-- Migration 005: Secure login
--   * Hash existing plaintext passwords with bcrypt (pgcrypto)
--   * Login moves to a SECURITY DEFINER RPC — the anon key can
--     no longer read the app_users table at all
-- Run in Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Add hash column and migrate existing plaintext passwords
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS password_hash TEXT;

UPDATE public.app_users
SET password_hash = crypt(password, gen_salt('bf'))
WHERE password_hash IS NULL AND password IS NOT NULL;

-- 2) Drop the plaintext column
ALTER TABLE public.app_users DROP COLUMN IF EXISTS password;

-- 3) Anon must not read app_users anymore (it exposed every credential)
DROP POLICY IF EXISTS "anon_read_for_login" ON public.app_users;

-- 4) Server-side login check. Returns one row on success, zero rows on failure.
CREATE OR REPLACE FUNCTION public.app_login(p_username TEXT, p_password TEXT)
RETURNS TABLE (id UUID, username TEXT, role TEXT, display_name TEXT, driver_id UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.username, u.role, u.display_name, u.driver_id
  FROM public.app_users u
  WHERE u.username = p_username
    AND u.active = true
    AND u.password_hash IS NOT NULL
    AND u.password_hash = crypt(p_password, u.password_hash);
$$;

REVOKE ALL ON FUNCTION public.app_login(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_login(TEXT, TEXT) TO anon;

-- ─── How to manage accounts after this migration ─────────────
-- Add a user:
--   INSERT INTO public.app_users (username, password_hash, role, display_name, driver_id)
--   VALUES ('driver02', crypt('pass1234', gen_salt('bf')), 'driver', 'ชื่อ พขร.', '<driver UUID>');
--
-- Change a password:
--   UPDATE public.app_users
--   SET password_hash = crypt('รหัสใหม่', gen_salt('bf'))
--   WHERE username = 'admin';
