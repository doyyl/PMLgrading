import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useRole } from '@/context/role';

export function AppShell() {
  const { pathname } = useLocation();
  const { role } = useRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!role && pathname !== '/') {
      navigate('/', { replace: true });
    }
  }, [role, pathname, navigate]);

  if (!role) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
