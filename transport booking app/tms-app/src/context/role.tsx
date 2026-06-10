

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type AppRole = 'admin' | 'driver' | 'manager';

interface RoleContextValue {
  role: AppRole | null;
  driverId: string | null;
  driverName: string | null;
  setRole: (role: AppRole) => void;
  setDriverIdentity: (id: string, name: string) => void;
  clearRole: () => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<AppRole | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverName, setDriverName] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('tms_role') as AppRole | null;
    const storedDriverId = localStorage.getItem('tms_driver_id');
    const storedDriverName = localStorage.getItem('tms_driver_name');
    if (stored) setRoleState(stored);
    if (storedDriverId && storedDriverId.length > 0) setDriverId(storedDriverId);
    if (storedDriverName && storedDriverName.length > 0) setDriverName(storedDriverName);
  }, []);

  const setRole = (r: AppRole) => {
    setRoleState(r);
    localStorage.setItem('tms_role', r);
    if (r !== 'driver') {
      setDriverId(null);
      setDriverName(null);
      localStorage.removeItem('tms_driver_id');
      localStorage.removeItem('tms_driver_name');
    }
  };

  const setDriverIdentity = (id: string, name: string) => {
    setDriverId(id);
    setDriverName(name);
    localStorage.setItem('tms_driver_id', id);
    localStorage.setItem('tms_driver_name', name);
  };

  const clearRole = () => {
    setRoleState(null);
    setDriverId(null);
    setDriverName(null);
    localStorage.removeItem('tms_role');
    localStorage.removeItem('tms_driver_id');
    localStorage.removeItem('tms_driver_name');
  };

  return (
    <RoleContext.Provider value={{ role, driverId, driverName, setRole, setDriverIdentity, clearRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used inside RoleProvider');
  return ctx;
}
