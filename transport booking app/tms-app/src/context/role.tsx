import { createContext, useContext, useState, type ReactNode } from 'react';

export type AppRole = 'admin' | 'driver' | 'manager';

// Default landing page per role — used by login redirect and route guards
export const ROLE_HOME: Record<AppRole, string> = {
  admin:   '/dashboard',
  driver:  '/driver',
  manager: '/manager',
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
  login: (user: AppUser) => void;
  clearRole: () => void;
  // legacy helpers kept for existing components
  setRole: (role: AppRole) => void;
  setDriverIdentity: (id: string, name: string) => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);

const KEYS = {
  role: 'tms_role',
  userId: 'tms_user_id',
  displayName: 'tms_display_name',
  driverId: 'tms_driver_id',
} as const;

export function RoleProvider({ children }: { children: ReactNode }) {
  // Lazy init from localStorage so guards see the session on first render
  // (an effect-based load caused a redirect-to-login flash on hard refresh)
  const [role, setRoleState] = useState<AppRole | null>(() => localStorage.getItem(KEYS.role) as AppRole | null);
  const [userId, setUserId] = useState<string | null>(() => localStorage.getItem(KEYS.userId));
  const [displayName, setDisplayNameState] = useState<string | null>(() => localStorage.getItem(KEYS.displayName));
  const [driverId, setDriverIdState] = useState<string | null>(() => localStorage.getItem(KEYS.driverId));

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
