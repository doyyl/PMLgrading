import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState, type ReactNode } from 'react';
import { RoleProvider, useRole, ROLE_HOME, type AppRole } from '@/context/role';
import { AppShell } from '@/components/layout/AppShell';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import BookingPage from '@/pages/BookingPage';
import PlanningPage from '@/pages/PlanningPage';
import TrackingPage from '@/pages/TrackingPage';
import SustainabilityPage from '@/pages/SustainabilityPage';
import DriverPage from '@/pages/DriverPage';
import ManagerPage from '@/pages/ManagerPage';
import ComingSoonPage from '@/pages/ComingSoonPage';

// Waits for session bootstrap, then redirects to login when logged out,
// or to the user's home when their role has no access to this route.
function RequireRole({ roles, children }: { roles: AppRole[]; children: ReactNode }) {
  const { role, isInitializing } = useRole();
  if (isInitializing) return null;
  if (!role) return <Navigate to="/" replace />;
  if (!roles.includes(role)) return <Navigate to={ROLE_HOME[role]} replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={
          <RequireRole roles={['admin', 'manager']}><DashboardPage /></RequireRole>
        } />
        <Route path="/booking" element={
          <RequireRole roles={['admin', 'logistics', 'cs']}><BookingPage /></RequireRole>
        } />
        <Route path="/planning" element={
          <RequireRole roles={['admin', 'manager', 'supervisor', 'planner']}><PlanningPage /></RequireRole>
        } />
        <Route path="/tracking" element={
          <RequireRole roles={['admin', 'manager', 'supervisor']}><TrackingPage /></RequireRole>
        } />
        <Route path="/tracking/sustainability" element={
          <RequireRole roles={['admin', 'manager']}><SustainabilityPage /></RequireRole>
        } />
        <Route path="/driver" element={
          <RequireRole roles={['driver']}><DriverPage /></RequireRole>
        } />
        <Route path="/manager" element={
          <RequireRole roles={['manager']}><ManagerPage /></RequireRole>
        } />
        <Route path="/wms/*" element={
          <RequireRole roles={['warehouse_op', 'supervisor', 'planner', 'admin']}><ComingSoonPage /></RequireRole>
        } />
        <Route path="/outbound/*" element={
          <RequireRole roles={['logistics', 'cs', 'admin']}><ComingSoonPage /></RequireRole>
        } />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <RoleProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'text-sm',
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' }, duration: 6000 },
          }}
        />
      </RoleProvider>
    </QueryClientProvider>
  );
}
