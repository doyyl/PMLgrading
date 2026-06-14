import { useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { AppUser } from '@/context/role';

// Synthetic email domain for Supabase Auth accounts (migration 006)
const AUTH_EMAIL_DOMAIN = '@tms.local';

interface AppUserRow {
  id: string;
  username: string;
  role: string;
  display_name: string;
  driver_id: string | null;
}

function toAppUser(row: AppUserRow): AppUser {
  return {
    id: row.id,
    username: row.username,
    role: row.role as AppUser['role'],
    displayName: row.display_name,
    driverId: row.driver_id,
  };
}

// Preferred path: real Supabase Auth session → RLS policies apply.
// Returns null when the auth user doesn't exist yet (migration 006
// not applied), so the caller can fall back.
async function supabaseAuthLogin(username: string, password: string): Promise<AppUser | null> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: `${username}${AUTH_EMAIL_DOMAIN}`,
    password,
  });
  if (error || !data.user) return null;

  const { data: profile } = await supabase
    .from('app_users')
    .select('id, username, role, display_name, driver_id')
    .eq('auth_uid', data.user.id)
    .single<AppUserRow>();

  if (!profile) {
    await supabase.auth.signOut();
    throw new Error('บัญชีนี้ยังไม่ได้ผูกกับโปรไฟล์ — รัน migration 006 ให้ครบ');
  }

  // Self-healing: if driver_id is missing (migration 009 not yet run), resolve it now.
  // The authenticated session allows SELECT on drivers under RLS.
  if (profile.role === 'driver' && !profile.driver_id) {
    const { data: driver } = await supabase
      .from('drivers')
      .select('id')
      .eq('employee_id', profile.username)
      .maybeSingle<{ id: string }>();
    if (driver) profile.driver_id = driver.id;
  }

  return toAppUser(profile);
}

// Fallback #1: app_login RPC (migration 005 applied, 006 not yet)
async function rpcLogin(username: string, password: string): Promise<AppUser | null> {
  const { data, error } = await createClient().rpc('app_login', {
    p_username: username,
    p_password: password,
  });
  if (error && (error.code === 'PGRST202' || /app_login/.test(error.message))) return null;
  if (error) throw new Error('เข้าสู่ระบบไม่สำเร็จ — ลองใหม่อีกครั้ง');
  const row = (Array.isArray(data) ? data[0] : data) as AppUserRow | undefined;
  if (!row) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  return toAppUser(row);
}

// Fallback #2: legacy plaintext check (no migrations applied)
async function legacyLogin(username: string, password: string): Promise<AppUser> {
  const { data, error } = await createClient()
    .from('app_users')
    .select('id, username, role, display_name, driver_id')
    .eq('username', username)
    .eq('password', password)
    .eq('active', true)
    .single<AppUserRow>();
  if (error || !data) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  return toAppUser(data);
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }): Promise<AppUser> => {
      const name = username.trim();

      const viaAuth = await supabaseAuthLogin(name, password);
      if (viaAuth) return viaAuth;

      const viaRpc = await rpcLogin(name, password);
      if (viaRpc) return viaRpc;

      return legacyLogin(name, password);
    },
  });
}

export async function signOutEverywhere() {
  try {
    await createClient().auth.signOut();
  } catch {
    // no auth session (pre-migration login) — nothing to do
  }
}
