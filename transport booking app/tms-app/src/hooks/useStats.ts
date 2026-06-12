import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Trip } from '@/hooks/useTrips';

export interface DayStat {
  date: string;        // YYYY-MM-DD
  label: string;       // short Thai label e.g. "12 มิ.ย."
  completed: number;
  in_progress: number;
  assigned: number;
  unassigned: number;
  cancelled: number;
}

export interface DriverStat {
  id: string;
  name: string;
  total: number;
  completed: number;
  cancelled: number;
  avgMinutes: number | null;   // avg started→completed duration
  completionRate: number;      // 0-100
}

export interface CustomerStat {
  customer: string;
  total: number;
  completed: number;
}

export interface RouteStat {
  route: string;
  count: number;
}

export interface DashboardStats {
  days: DayStat[];
  drivers: DriverStat[];
  customers: CustomerStat[];
  routes: RouteStat[];
  statusTotals: Record<Trip['status'], number>;
  kpi: {
    totalTrips: number;
    completed: number;
    cancelled: number;
    completionRate: number;     // % of non-cancelled trips completed
    avgMinutes: number | null;
    activeDrivers: number;
    totalBookings: number;
    pendingBookings: number;
  };
}

function dateNDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function thLabel(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

export function useDashboardStats(rangeDays: number) {
  return useQuery({
    queryKey: ['dashboard-stats', rangeDays],
    refetchInterval: 60_000,
    queryFn: async (): Promise<DashboardStats> => {
      const from = dateNDaysAgo(rangeDays - 1);
      const supabase = createClient();
      const [tripsRes, bookingsRes] = await Promise.all([
        supabase
          .from('trips')
          .select('id, status, scheduled_date, customer, loading_place, destination, started_at, completed_at, driver:drivers(id, name)')
          .gte('scheduled_date', from),
        supabase
          .from('bookings')
          .select('id, status')
          .gte('requested_date', from),
      ]);
      if (tripsRes.error) throw new Error(tripsRes.error.message);
      if (bookingsRes.error) throw new Error(bookingsRes.error.message);

      const trips = (tripsRes.data ?? []) as unknown as (Pick<Trip,
        'id' | 'status' | 'scheduled_date' | 'customer' | 'loading_place' | 'destination' | 'started_at' | 'completed_at'
      > & { driver: { id: string; name: string } | null })[];
      const bookings = bookingsRes.data ?? [];

      // ── Per-day series (fill every day in range, even empty ones) ──
      const dayMap = new Map<string, DayStat>();
      for (let i = rangeDays - 1; i >= 0; i--) {
        const date = dateNDaysAgo(i);
        dayMap.set(date, { date, label: thLabel(date), completed: 0, in_progress: 0, assigned: 0, unassigned: 0, cancelled: 0 });
      }

      const statusTotals: Record<Trip['status'], number> = {
        unassigned: 0, assigned: 0, in_progress: 0, completed: 0, cancelled: 0,
      };
      const driverMap = new Map<string, { name: string; total: number; completed: number; cancelled: number; durations: number[] }>();
      const customerMap = new Map<string, { total: number; completed: number }>();
      const routeMap = new Map<string, number>();
      const allDurations: number[] = [];

      for (const t of trips) {
        statusTotals[t.status]++;

        const day = t.scheduled_date ? dayMap.get(t.scheduled_date) : undefined;
        if (day) day[t.status]++;

        if (t.driver) {
          if (!driverMap.has(t.driver.id)) {
            driverMap.set(t.driver.id, { name: t.driver.name, total: 0, completed: 0, cancelled: 0, durations: [] });
          }
          const d = driverMap.get(t.driver.id)!;
          d.total++;
          if (t.status === 'completed') {
            d.completed++;
            if (t.started_at && t.completed_at) {
              const mins = (new Date(t.completed_at).getTime() - new Date(t.started_at).getTime()) / 60_000;
              if (mins > 0 && mins < 24 * 60) { // ignore bad timestamps
                d.durations.push(mins);
                allDurations.push(mins);
              }
            }
          }
          if (t.status === 'cancelled') d.cancelled++;
        }

        const cust = t.customer ?? 'ไม่ระบุ';
        if (!customerMap.has(cust)) customerMap.set(cust, { total: 0, completed: 0 });
        const c = customerMap.get(cust)!;
        if (t.status !== 'cancelled') {
          c.total++;
          if (t.status === 'completed') c.completed++;
        }

        if (t.loading_place && t.destination && t.status !== 'cancelled') {
          const route = `${t.loading_place} → ${t.destination}`;
          routeMap.set(route, (routeMap.get(route) ?? 0) + 1);
        }
      }

      const avg = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;

      const drivers: DriverStat[] = Array.from(driverMap.entries())
        .map(([id, d]) => {
          const nonCancelled = d.total - d.cancelled;
          return {
            id, name: d.name,
            total: d.total, completed: d.completed, cancelled: d.cancelled,
            avgMinutes: avg(d.durations),
            completionRate: nonCancelled > 0 ? Math.round((d.completed / nonCancelled) * 100) : 0,
          };
        })
        .sort((a, b) => b.completed - a.completed);

      const customers: CustomerStat[] = Array.from(customerMap.entries())
        .map(([customer, c]) => ({ customer, ...c }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 6);

      const routes: RouteStat[] = Array.from(routeMap.entries())
        .map(([route, count]) => ({ route, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      const totalTrips = trips.length;
      const nonCancelled = totalTrips - statusTotals.cancelled;

      return {
        days: Array.from(dayMap.values()),
        drivers,
        customers,
        routes,
        statusTotals,
        kpi: {
          totalTrips,
          completed: statusTotals.completed,
          cancelled: statusTotals.cancelled,
          completionRate: nonCancelled > 0 ? Math.round((statusTotals.completed / nonCancelled) * 100) : 0,
          avgMinutes: avg(allDurations),
          activeDrivers: driverMap.size,
          totalBookings: bookings.length,
          pendingBookings: bookings.filter(b => b.status === 'Pending').length,
        },
      };
    },
  });
}

export function formatDuration(mins: number | null) {
  if (mins == null) return '–';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h} ชม. ${m} น.` : `${m} นาที`;
}
