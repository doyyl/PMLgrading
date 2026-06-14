import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

export type AppRole =
  | 'admin'
  | 'driver'
  | 'manager'
  // WMS/TMS operational personas (added in migration 010_a)
  | 'warehouse_op'   // OP — packout, warehouse-daily, vanbox lifecycle entry
  | 'supervisor'     // พี่เลี้ยง — approves shift, confirms daily report
  | 'planner'        // repack/vanbox/production planning + master data
  | 'logistics'      // booking, loading, vendor/freight, release
  | 'cs';            // customer service — booking, docs, special instructions

// Default landing page per role — used by login redirect and route guards
export const ROLE_HOME: Record<AppRole, string> = {
  admin:        '/dashboard',
  driver:       '/driver',
  manager:      '/manager',
  warehouse_op: '/wms/packout',
  supervisor:   '/wms/warehouse-daily',
  planner:      '/wms/planning',
  logistics:    '/outbound/domestic',
  cs:           '/outbound/domestic',
};

export interface AppUser {
  id: string;
  username: string;
  role: AppRole;
  displayName: string;
  driverId: string | null;
}

interface RoleContextValue {
  role: AppRole | null;
  userId: string | null;
  displayName: string | null;
  driverId: string | null;
  driverName: string | null;
  isInitializing: boolean;
  login: (user: AppUser) => void;
  clearRole: () => void;
  // legacy helpers kept for existing components
  setRole: (role: AppRole) => void;
  setDriverIdentity: (id: string, name: string) => void;
}

interface AppUserRow {
  id: string;
  username: string;
  role: string;
  display_name: string;
  driver_id: string | null;
}

const RoleContext = createContext<RoleContextValue | null>(null);

const KEYS = {
  role: 'tms_role',
  userId: 'tms_user_id',
  displayName: 'tms_display_name',
  driverId: 'tms_driver_id',
} as const;

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<AppRole | null>(() => localStorage.getItem(KEYS.role) as AppRole | null);
  const [userId, setUserId] = useState<string | null>(() => localStorage.getItem(KEYS.userId));
  const [displayName, setDisplayNameState] = useState<string | null>(() => localStorage.getItem(KEYS.displayName));
  const [driverId, setDriverIdState] = useState<string | null>(() => localStorage.getItem(KEYS.driverId));
  // Only initializing when there's no local session — need to check Supabase Auth
  const [isInitializing, setIsInitializing] = useState(() => !localStorage.getItem(KEYS.role));

  useEffect(() => {
    const supabase = createClient();

    // Always listen for remote sign-out / token expiry
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setRoleState(null);
        setUserId(null);
        setDisplayNameState(null);
        setDriverIdState(null);
        Object.values(KEYS).forEach(k => localStorage.removeItem(k));
        localStorage.removeItem('tms_driver_name');
      }
    });

    // Restore session from Supabase Auth when localStorage was cleared
    if (!localStorage.getItem(KEYS.role)) {
      void supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('app_users')
            .select('id, username, role, display_name, driver_id')
            .eq('auth_uid', session.user.id)
            .single<AppUserRow>();
          if (profile) {
            setRoleState(profile.role as AppRole);
            setUserId(profile.id);
            setDisplayNameState(profile.display_name);
            setDriverIdState(profile.driver_id);
            localStorage.setItem(KEYS.role, profile.role);
            localStorage.setItem(KEYS.userId, profile.id);
            localStorage.setItem(KEYS.displayName, profile.display_name);
            if (profile.driver_id) localStorage.setItem(KEYS.driverId, profile.driver_id);
          }
        }
        setIsInitializing(false);
      }).catch(() => setIsInitializing(false));
    }

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = (user: AppUser) => {
    setRoleState(user.role);
    setUserId(user.id);
    setDisplayNameState(user.displayName);
    setDriverIdState(user.driverId);
    localStorage.setItem(KEYS.role, user.role);
    localStorage.setItem(KEYS.userId, user.id);
    localStorage.setItem(KEYS.displayName, user.displayName);
    if (user.driverId) {
      localStorage.setItem(KEYS.driverId, user.driverId);
    } else {
      localStorage.removeItem(KEYS.driverId);
    }
  };

  const clearRole = () => {
    setRoleState(null);
    setUserId(null);
    setDisplayNameState(null);
    setDriverIdState(null);
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('tms_driver_name');
  };

  const setRole = (r: AppRole) => {
    setRoleState(r);
    localStorage.setItem(KEYS.role, r);
  };

  const setDriverIdentity = (id: string, name: string) => {
    setDriverIdState(id);
    setDisplayNameState(name);
    localStorage.setItem(KEYS.driverId, id);
    localStorage.setItem('tms_driver_name', name);
  };

  return (
    <RoleContext.Provider value={{
      role, userId, displayName, driverId,
      driverName: displayName,
      isInitializing,
      login, clearRole, setRole, setDriverIdentity,
    }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used inside RoleProvider');
  return ctx;
}
