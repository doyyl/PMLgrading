import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';
import { RoleProvider } from '@/context/role';
import { AppShell } from '@/components/layout/AppShell';
import LandingPage from '@/pages/LandingPage';
import BookingPage from '@/pages/BookingPage';
import PlanningPage from '@/pages/PlanningPage';
import TrackingPage from '@/pages/TrackingPage';
import SustainabilityPage from '@/pages/SustainabilityPage';
import DriverPage from '@/pages/DriverPage';
import ManagerPage from '@/pages/ManagerPage';

export default function App() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <RoleProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route element={<AppShell />}>
              <Route path="/booking" element={<BookingPage />} />
              <Route path="/planning" element={<PlanningPage />} />
              <Route path="/tracking" element={<TrackingPage />} />
              <Route path="/tracking/sustainability" element={<SustainabilityPage />} />
              <Route path="/driver" element={<DriverPage />} />
              <Route path="/manager" element={<ManagerPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'text-sm',
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' }, duration: 6000 },
          }}
        />
      </RoleProvider>
    </QueryClientProvider>
  );
}
