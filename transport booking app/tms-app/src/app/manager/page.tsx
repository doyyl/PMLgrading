

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Booking, DailyPlan, Driver, Vehicle } from '@/types';
import { cn } from '@/lib/utils';
import { Truck, Users, Calendar, Activity, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

// ── Data hooks ────────────────────────────────────────────────

function useManagerStats() {
  return useQuery({
    queryKey: ['manager-stats'],
    queryFn: async () => {
      const supabase = createClient();
      const today = new Date().toISOString().split('T')[0];
      const [bookings, plans, drivers, vehicles, alerts] = await Promise.all([
        supabase.from('bookings').select('id, status', { count: 'exact' }),
        supabase.from('transport_plans').select('id, status, plan_date').eq('plan_date', today),
        supabase.from('drivers').select('id', { count: 'exact' }).eq('active', true),
        supabase.from('vehicles').select('id', { count: 'exact' }).eq('active', true),
        supabase.from('trip_events').select('id', { count: 'exact', head: true }).eq('acknowledged', false),
      ]);
      const planData = plans.data ?? [];
      return {
        totalBookings:    bookings.count ?? 0,
        pendingBookings:  (bookings.data ?? []).filter(b => b.status === 'Pending').length,
        todayDispatched:  planData.filter(p => p.status === 'Dispatched').length,
        todayCompleted:   planData.filter(p => p.status === 'Completed').length,
        activeDrivers:    drivers.count ?? 0,
        activeVehicles:   vehicles.count ?? 0,
        unackedAlerts:    alerts.count ?? 0,
      };
    },
    refetchInterval: 30_000,
  });
}

function useAllBookings() {
  return useQuery({
    queryKey: ['manager-bookings'],
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('bookings')
        .select('*, site:sites!bookings_site_id_fkey(*)')
        .order('requested_date', { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return data as Booking[];
    },
  });
}

function useAllPlans() {
  return useQuery({
    queryKey: ['manager-plans'],
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('transport_plans')
        .select('*, booking:bookings!transport_plans_booking_id_fkey(booking_ref, cargo_type), driver:drivers(name), vehicle:vehicles(plate_number, vehicle_type)')
        .order('plan_date', { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return data as DailyPlan[];
    },
  });
}

function useAllDrivers() {
  return useQuery({
    queryKey: ['manager-drivers'],
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('drivers')
        .select('*')
        .order('name');
      if (error) throw new Error(error.message);
      return data as Driver[];
    },
  });
}

function useAllVehicles() {
  return useQuery({
    queryKey: ['manager-vehicles'],
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('vehicles')
        .select('*')
        .order('plate_number');
      if (error) throw new Error(error.message);
      return data as Vehicle[];
    },
  });
}

// ── UI helpers ────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  Pending:    'bg-gray-100 text-gray-600',
  Confirmed:  'bg-blue-100 text-blue-700',
  Cancelled:  'bg-red-100 text-red-600',
  Draft:      'bg-gray-100 text-gray-600',
  Assigned:   'bg-amber-100 text-amber-700',
  Dispatched: 'bg-blue-100 text-blue-700',
  Completed:  'bg-emerald-100 text-emerald-700',
};

function Badge({ status }: { status: string }) {
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-600')}>
      {status}
    </span>
  );
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className={cn('rounded-2xl p-4 text-white shadow-md', color)}>
      <div className="flex items-center justify-between mb-2">
        <div className="opacity-80">{icon}</div>
      </div>
      <p className="text-3xl font-bold leading-none">{value}</p>
      <p className="text-sm mt-1 opacity-90 font-medium">{label}</p>
      {sub && <p className="text-xs mt-0.5 opacity-70">{sub}</p>}
    </div>
  );
}

type Tab = 'bookings' | 'plans' | 'drivers' | 'vehicles';

function SortableHeader({ label, field, sort, onSort }: { label: string; field: string; sort: { field: string; asc: boolean }; onSort: (f: string) => void }) {
  const active = sort.field === field;
  return (
    <th
      className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-800"
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {active ? (sort.asc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null}
      </span>
    </th>
  );
}

// ── Page ────────────────────────────────────────────────────

export default function ManagerPage() {
  const [tab, setTab] = useState<Tab>('bookings');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ field: string; asc: boolean }>({ field: '', asc: true });

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useManagerStats();
  const { data: bookings } = useAllBookings();
  const { data: plans } = useAllPlans();
  const { data: drivers } = useAllDrivers();
  const { data: vehicles } = useAllVehicles();

  const handleSort = (field: string) => {
    setSort(prev => prev.field === field ? { field, asc: !prev.asc } : { field, asc: true });
  };

  const q = search.toLowerCase();

  const filteredBookings = (bookings ?? []).filter(b =>
    !q || b.booking_ref.toLowerCase().includes(q) || b.site?.site_name?.toLowerCase().includes(q) || b.status.toLowerCase().includes(q)
  );

  const filteredPlans = (plans ?? []).filter(p =>
    !q || p.booking?.booking_ref?.toLowerCase().includes(q) || p.driver?.name?.toLowerCase().includes(q) || p.vehicle?.plate_number?.toLowerCase().includes(q) || p.status.toLowerCase().includes(q)
  );

  const filteredDrivers = (drivers ?? []).filter(d =>
    !q || d.name.toLowerCase().includes(q) || d.driver_category.toLowerCase().includes(q) || d.license_type.toLowerCase().includes(q)
  );

  const filteredVehicles = (vehicles ?? []).filter(v =>
    !q || v.plate_number.toLowerCase().includes(q) || v.vehicle_type.toLowerCase().includes(q) || v.ownership.toLowerCase().includes(q)
  );

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'bookings', label: 'คำจอง', count: bookings?.length ?? 0 },
    { id: 'plans',    label: 'แผนงาน', count: plans?.length ?? 0 },
    { id: 'drivers',  label: 'พนักงาน', count: drivers?.length ?? 0 },
    { id: 'vehicles', label: 'รถ',      count: vehicles?.length ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ภาพรวมระบบ</h1>
          <p className="text-sm text-gray-500 mt-0.5">ข้อมูลทั้งหมดแบบ real-time</p>
        </div>
        <button
          onClick={() => refetchStats()}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 shadow-sm"
        >
          <RefreshCw className="h-4 w-4" />
          รีเฟรช
        </button>
      </div>

      {/* Stats grid */}
      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Calendar className="h-5 w-5" />} label="คำจองทั้งหมด"    value={stats.totalBookings}    sub={`รอ ${stats.pendingBookings} รายการ`} color="bg-blue-600" />
          <StatCard icon={<Truck className="h-5 w-5" />}    label="วิ่งงานวันนี้"     value={stats.todayDispatched}  sub={`สำเร็จ ${stats.todayCompleted} รายการ`} color="bg-emerald-600" />
          <StatCard icon={<Users className="h-5 w-5" />}    label="พนักงานขับรถ"      value={stats.activeDrivers}    sub="ที่ active" color="bg-indigo-600" />
          <StatCard icon={<Activity className="h-5 w-5" />} label="แจ้งเตือนค้าง"    value={stats.unackedAlerts}    sub={`รถ ${stats.activeVehicles} คัน`} color={stats.unackedAlerts > 0 ? 'bg-red-500' : 'bg-gray-500'} />
        </div>
      )}

      {/* Search + Tabs */}
      <div className="space-y-3">
        <input
          type="text"
          placeholder="ค้นหา..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors',
                tab === t.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              {t.label}
              <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-bold', tab === t.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500')}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table area */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {tab === 'bookings' && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <SortableHeader label="Ref" field="booking_ref" sort={sort} onSort={handleSort} />
                  <SortableHeader label="วันที่" field="requested_date" sort={sort} onSort={handleSort} />
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">สถานที่</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ประเภทรถ</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">สินค้า</th>
                  <SortableHeader label="สถานะ" field="status" sort={sort} onSort={handleSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredBookings.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 font-mono text-xs font-semibold text-gray-700">{b.booking_ref}</td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(b.requested_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-3 py-3 text-gray-800 max-w-[160px] truncate">{b.site?.site_name ?? '–'}</td>
                    <td className="px-3 py-3 text-gray-600">{b.vehicle_type}</td>
                    <td className="px-3 py-3 text-gray-600">{b.cargo_type}{b.is_bpa_cargo && <span className="ml-1 text-xs text-orange-500 font-semibold">BPA</span>}</td>
                    <td className="px-3 py-3"><Badge status={b.status} /></td>
                  </tr>
                ))}
                {filteredBookings.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-400">ไม่พบข้อมูล</td></tr>
                )}
              </tbody>
            </table>
          )}

          {tab === 'plans' && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <SortableHeader label="วันที่" field="plan_date" sort={sort} onSort={handleSort} />
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Booking</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">พนักงานขับ</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ทะเบียนรถ</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">เส้นทาง</th>
                  <SortableHeader label="สถานะ" field="status" sort={sort} onSort={handleSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredPlans.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(p.plan_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs font-semibold text-gray-700">{p.booking?.booking_ref ?? '–'}</td>
                    <td className="px-3 py-3 text-gray-800">{p.driver?.name ?? <span className="text-gray-400">ยังไม่มอบหมาย</span>}</td>
                    <td className="px-3 py-3 text-gray-600">{p.vehicle?.plate_number ?? '–'}</td>
                    <td className="px-3 py-3 text-gray-600 text-xs">{p.route_category}</td>
                    <td className="px-3 py-3"><Badge status={p.status} /></td>
                  </tr>
                ))}
                {filteredPlans.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-400">ไม่พบข้อมูล</td></tr>
                )}
              </tbody>
            </table>
          )}

          {tab === 'drivers' && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ชื่อ</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ประเภท</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ใบขับขี่</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">เบอร์โทร</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ADR หมดอายุ</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredDrivers.map(d => {
                  const adrExpired = d.adr_certificate_expiry && new Date(d.adr_certificate_expiry) < new Date();
                  return (
                    <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3 font-medium text-gray-900">{d.name}</td>
                      <td className="px-3 py-3 text-gray-600">{d.driver_category}</td>
                      <td className="px-3 py-3 text-gray-600">{d.license_type}</td>
                      <td className="px-3 py-3 text-gray-500">{d.phone ?? '–'}</td>
                      <td className="px-3 py-3">
                        {d.adr_certificate_expiry
                          ? <span className={cn('text-xs', adrExpired ? 'text-red-600 font-semibold' : 'text-gray-500')}>
                              {new Date(d.adr_certificate_expiry).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                              {adrExpired && ' ⚠️'}
                            </span>
                          : <span className="text-gray-300 text-xs">–</span>
                        }
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', d.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600')}>
                          {d.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredDrivers.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-400">ไม่พบข้อมูล</td></tr>
                )}
              </tbody>
            </table>
          )}

          {tab === 'vehicles' && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ทะเบียน</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ประเภท</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">เจ้าของ</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">พลังงาน</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Battery</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredVehicles.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 font-mono font-semibold text-gray-900">{v.plate_number}</td>
                    <td className="px-3 py-3 text-gray-600">{v.vehicle_type}</td>
                    <td className="px-3 py-3 text-gray-600">{v.ownership}</td>
                    <td className="px-3 py-3">
                      <span className={cn('text-xs font-semibold', v.powertrain === 'EV' ? 'text-emerald-600' : 'text-gray-500')}>
                        {v.powertrain === 'EV' ? '⚡ EV' : '⛽ Diesel'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {v.powertrain === 'EV' && v.battery_soc != null
                        ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 rounded-full bg-gray-200 overflow-hidden">
                              <div
                                className={cn('h-full rounded-full', v.battery_soc >= 50 ? 'bg-emerald-500' : v.battery_soc >= 20 ? 'bg-amber-400' : 'bg-red-500')}
                                style={{ width: `${v.battery_soc}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{v.battery_soc}%</span>
                          </div>
                        )
                        : <span className="text-gray-300 text-xs">–</span>
                      }
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', v.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600')}>
                        {v.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredVehicles.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-400">ไม่พบข้อมูล</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
