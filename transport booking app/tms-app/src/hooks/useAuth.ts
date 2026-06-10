import { useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { AppUser } from '@/context/role';

interface AppUserRow {
  id: string;
  username: string;
  role: string;
  display_name: string;
  driver_id: string | null;
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }): Promise<AppUser> => {
      const { data, error } = await createClient()
        .from('app_users')
        .select('id, username, role, display_name, driver_id')
        .eq('username', username.trim())
        .eq('password', password)
        .eq('active', true)
        .single<AppUserRow>();

      if (error || !data) {
        throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }

      return {
        id: data.id,
        username: data.username,
        role: data.role as AppUser['role'],
        displayName: data.display_name,
        driverId: data.driver_id,
      };
    },
  });
}
