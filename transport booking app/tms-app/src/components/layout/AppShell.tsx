import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useRole } from '@/context/role';

export function AppShell() {
  const { pathname } = useLocation();
  const { role, isInitializing } = useRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isInitializing && !role && pathname !== '/') {
      navigate('/', { replace: true });
    }
  }, [role, isInitializing, pathname, navigate]);

  if (isInitializing) return (
    <div className="flex h-screen items-center justify-center bg-[#00205C]">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFB800] font-black text-sm text-[#00205C]">
          KN
        </div>
        <div className="h-5 w-5 rounded-full border-2 border-white/20 border-t-[#FFB800] animate-spin" />
      </div>
    </div>
  );

  if (!role) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F6F9]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
