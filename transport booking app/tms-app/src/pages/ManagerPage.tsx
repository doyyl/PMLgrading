import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  useAllTrips, useDriverWorkload,
  useOpenIssues, useResolveIssue, issueTypeLabel, issueTypeIcon,
  type Trip,
} from '@/hooks/useTrips';
import type { Booking, Driver, Vehicle } from '@/types';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  Truck, Users, Calendar, Activity, RefreshCw,
  ChevronDown, ChevronUp, BarChart3, CheckCircle2, Clock, AlertTriangle,
} from 'lucide-react';

// ── Data hooks ────────────────────────────────────────────────

function useManagerStats() {
  return useQuery({
    queryKey: ['manager-stats'],
    refetchInterval: 30_000,
    queryFn: async () => {
      const supabase = createClient();
      const today = new Date().toISOString().split('T')[0];
      const [bookings, trips, drivers, vehicles] = await Promise.all([
        supabase.from('bookings').select('id, status'),
        supabase.from('trips').select('id, status, scheduled_date').neq('status', 'cancelled'),
        supabase.from('drivers').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('active', true),
      ]);
      const tripData = trips.data ?? [];
      const todayTrips = tripData.filter(t => t.scheduled_date === today);
      const bookingData = bookings.data ?? [];
      return {
        totalBookings:   bookingData.length,
        pendingBookings: bookingData.filter(b => b.status === 'Pending').length,
        todayDispatched: todayTrips.filter(t => t.status === 'in_progress' || t.status === 'assigned').length,
        todayCompleted:  todayTrips.filter(t => t.status === 'completed').length,
        todayPending:    tripData.filter(t => t.status === 'unassigned').length,
        activeDrivers:   drivers.count ?? 0,
        activeVehicles:  vehicles.count ?? 0,
      };
    },
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

function useAllDrivers() {
  return useQuery({
    queryKey: ['manager-drivers'],
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('drivers').select('*').order('name');
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
        .from('vehicles').select('*').order('plate_number');
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
      <div className="mb-2 opacity-80">{icon}</div>
      <p className="text-3xl font-bold leading-none">{value}</p>
      <p className="text-sm mt-1 opacity-90 font-medium">{label}</p>
      {sub && <p className="text-xs mt-0.5 opacity-70">{sub}</p>}
    </div>
  );
}

function SortableHeader({ label, field, sort, onSort }: {
  label: string; field: string;
  sort: { field: string; asc: boolean }; onSort: (f: string) => void;
}) {
  const active = sort.field === field;
  return (
    <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-800"
      onClick={() => onSort(field)}>
      <span className="flex items-center gap-1">
        {label}
        {active && (sort.asc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </span>
    </th>
  );
}

type Tab = 'jobs' | 'bookings' | 'drivers' | 'vehicles' | 'workload' | 'issues';

const TRIP_STATUS_LABEL: Record<Trip['status'], string> = {
  unassigned:  'รอมอบหมาย',
  assigned:    'มอบหมายแล้ว',
  in_progress: 'กำลังวิ่ง',
  completed:   'เสร็จแล้ว',
  cancelled:   'ยกเลิก',
};
const TRIP_STATUS_COLOR: Record<Trip['status'], string> = {
  unassigned:  'bg-gray-100 text-gray-600',
  assigned:    'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-600',
};

// ── Jobs Tab ─────────────────────────────────────────────────

function JobsTab({ search }: { search: string }) {
  const { data: trips = [], isLoading } = useAllTrips();
  const q = search.toLowerCase();

  const filtered = trips.filter(t => {
    if (!q) return true;
    return (
      (t.customer ?? '').toLowerCase().includes(q) ||
      (t.destination ?? '').toLowerCase().includes(q) ||
      (t.loading_place ?? '').toLowerCase().includes(q) ||
      (t.driver?.name ?? '').toLowerCase().includes(q) ||
      (t.booking?.booking_ref ?? '').toLowerCase().includes(q)
    );
  });

  const groups: { label: string; status: Trip['status']; icon: React.ReactNode }[] = [
    { label: 'กำลังวิ่ง', status: 'in_progress', icon: <Truck className="h-4 w-4 text-amber-500" /> },
    { label: 'มอบหมายแล้ว', status: 'assigned', icon: <Clock className="h-4 w-4 text-blue-500" /> },
    { label: 'รอมอบหมาย', status: 'unassigned', icon: <AlertTriangle className="h-4 w-4 text-gray-400" /> },
    { label: 'เสร็จแล้ว', status: 'completed', icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" /> },
  ];

  if (isLoading) return (
    <div className="space-y-3 p-4">
      {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}
    </div>
  );

  return (
    <div className="p-4 space-y-6">
      {groups.map(({ label, status, icon }) => {
        const items = filtered.filter(t => t.status === status);
        if (items.length === 0) return null;
        return (
          <div key={status}>
            <div className="flex items-center gap-2 mb-2">
              {icon}
              <p className="text-sm font-bold text-gray-700">{label}</p>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-500">{items.length}</span>
            </div>
            <div className="rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">วันที่</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">เที่ยว</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">ลูกค้า</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">เส้นทาง</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">พขร.</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap text-xs">
                        {t.scheduled_date ? new Date(t.scheduled_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '–'}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-bold text-gray-700">#{t.trip_number}</td>
                      <td className="px-3 py-2.5 text-gray-700 max-w-[100px] truncate text-xs">{t.customer ?? '–'}</td>
                      <td className="px-3 py-2.5 text-gray-600 text-xs max-w-[140px] truncate">
                        {t.loading_place ?? '?'} → {t.destination ?? '?'}
                      </td>
                      <td className="px-3 py-2.5 text-gray-800 text-xs">
                        {t.driver?.name ?? <span className="text-gray-400 italic">ยังไม่มอบหมาย</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', TRIP_STATUS_COLOR[t.status])}>
                          {TRIP_STATUS_LABEL[t.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      {filtered.length === 0 && (
        <p className="text-center py-8 text-sm text-gray-400">ไม่พบข้อมูล</p>
      )}
    </div>
  );
}

// ── Workload Tab ─────────────────────────────────────────────

function WorkloadTab() {
  const { data: workload = [], isLoading } = useDriverWorkload();

  if (isLoading) return (
    <div className="space-y-3 p-4">
      {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}
    </div>
  );

  if (workload.length === 0) {
    return <p className="text-center py-12 text-sm text-gray-400">ยังไม่มีข้อมูลภาระงาน</p>;
  }

  return (
    <div className="p-4">
      <div className="rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">พนักงานขับรถ</th>
              <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">รวมเที่ยว</th>
              <th className="px-3 py-2.5 text-center text-xs font-bold text-amber-600 uppercase">กำลังวิ่ง</th>
              <th className="px-3 py-2.5 text-center text-xs font-bold text-green-600 uppercase">เสร็จแล้ว</th>
              <th className="px-3 py-2.5 text-center text-xs font-bold text-blue-600 uppercase">มอบหมาย</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {workload.map(w => (
              <tr key={w.driver.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-3 font-medium text-gray-900">{w.driver.name}</td>
                <td className="px-3 py-3 text-center font-bold text-gray-700">{w.total}</td>
                <td className="px-3 py-3 text-center">
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold',
                    w.inProgress > 0 ? 'bg-amber-100 text-amber-700' : 'text-gray-300')}>
                    {w.inProgress}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold',
                    w.completed > 0 ? 'bg-emerald-100 text-emerald-700' : 'text-gray-300')}>
                    {w.completed}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold',
                    w.assigned > 0 ? 'bg-blue-100 text-blue-700' : 'text-gray-300')}>
                    {w.assigned}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Issues Tab (driver-reported problems) ────────────────────

function IssuesTab() {
  const { data: issues = [], isLoading } = useOpenIssues();
  const resolveIssue = useResolveIssue();

  async function resolve(id: string) {
    try {
      await resolveIssue.mutateAsync({ issueId: id });
      toast.success('ทำเครื่องหมาย "แก้ไขแล้ว"');
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
  }

  if (isLoading) return (
    <div className="space-y-3 p-4">
      {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />)}
    </div>
  );

  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-14 text-gray-400">
        <CheckCircle2 className="h-9 w-9 text-emerald-300" />
        <p className="text-sm font-medium">ไม่มีปัญหาที่รอแก้ไข</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-50">
      {issues.map(iss => (
        <div key={iss.id} className="flex items-start gap-3 p-4">
          <div className="text-2xl leading-none mt-0.5 shrink-0">{issueTypeIcon(iss.issue_type)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-gray-800 text-sm">{issueTypeLabel(iss.issue_type)}</span>
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                เที่ยว {iss.trip?.trip_number ?? '?'}
              </span>
              {iss.trip?.customer && <span className="text-xs font-medium text-gray-600">{iss.trip.customer}</span>}
            </div>
            {iss.description && <p className="text-sm text-gray-600 mt-1">{iss.description}</p>}
            <div className="flex items-center gap-x-3 gap-y-0.5 text-xs text-gray-400 mt-1 flex-wrap">
              {iss.driver?.name && <span>👤 {iss.driver.name}</span>}
              {iss.trip && (iss.trip.loading_place || iss.trip.destination) && (
                <span>{iss.trip.loading_place ?? '?'} → {iss.trip.destination ?? '?'}</span>
              )}
              <span>{new Date(iss.created_at).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              {iss.photo_url && (
                <a href={iss.photo_url} target="_blank" rel="noreferrer" className="text-blue-500 underline underline-offset-2">
                  ดูรูป
                </a>
              )}
            </div>
          </div>
          <button onClick={() => resolve(iss.id)} disabled={resolveIssue.isPending}
            className="shrink-0 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
            แก้ไขแล้ว
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function ManagerPage() {
  const [tab, setTab] = useState<Tab>('jobs');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ field: string; asc: boolean }>({ field: '', asc: true });

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useManagerStats();
  const { data: bookings } = useAllBookings();
  const { data: drivers } = useAllDrivers();
  const { data: vehicles } = useAllVehicles();
  const { data: openIssues } = useOpenIssues();

  const handleSort = (field: string) =>
    setSort(prev => prev.field === field ? { field, asc: !prev.asc } : { field, asc: true });

  const q = search.toLowerCase();

  const filteredBookings = (bookings ?? []).filter(b =>
    !q || b.booking_ref.toLowerCase().includes(q) || b.site?.site_name?.toLowerCase().includes(q) || b.status.toLowerCase().includes(q)
  );
  const filteredDrivers = (drivers ?? []).filter(d =>
    !q || d.name.toLowerCase().includes(q) || d.driver_category.toLowerCase().includes(q)
  );
  const filteredVehicles = (vehicles ?? []).filter(v =>
    !q || v.plate_number.toLowerCase().includes(q) || v.vehicle_type.toLowerCase().includes(q)
  );

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'jobs',     label: 'งานทั้งหมด' },
    { id: 'workload', label: 'ภาระงาน' },
    { id: 'issues',   label: '⚠️ แจ้งปัญหา', count: openIssues?.length },
    { id: 'bookings', label: 'คำจอง',    count: bookings?.length },
    { id: 'drivers',  label: 'พนักงาน',  count: drivers?.length },
    { id: 'vehicles', label: 'รถ',        count: vehicles?.length },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ภาพรวมระบบ</h1>
          <p className="text-sm text-gray-500">ข้อมูลแบบ real-time</p>
        </div>
        <div className="flex gap-2">
          <Link to="/dashboard"
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm">
            <BarChart3 className="h-4 w-4" /> ดูสถิติ
          </Link>
          <button
            onClick={() => refetchStats()}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 shadow-sm"
          >
            <RefreshCw className="h-4 w-4" /> รีเฟรช
          </button>
        </div>
      </div>

      {/* Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Calendar className="h-5 w-5" />} label="คำจองทั้งหมด"
            value={stats.totalBookings} sub={`รอ ${stats.pendingBookings}`} color="bg-blue-600" />
          <StatCard icon={<Truck className="h-5 w-5" />} label="วิ่งงานวันนี้"
            value={stats.todayDispatched} sub={`สำเร็จ ${stats.todayCompleted}`} color="bg-emerald-600" />
          <StatCard icon={<AlertTriangle className="h-5 w-5" />} label="รอมอบหมาย"
            value={stats.todayPending} sub="งานวันนี้" color={stats.todayPending > 0 ? 'bg-amber-500' : 'bg-gray-500'} />
          <StatCard icon={<Users className="h-5 w-5" />} label="พนักงานขับรถ"
            value={stats.activeDrivers} sub={`รถ ${stats.activeVehicles} คัน`} color="bg-indigo-600" />
        </div>
      )}

      {/* Search + Tabs */}
      <div className="space-y-3">
        {tab !== 'workload' && tab !== 'issues' && (
          <input
            type="text"
            placeholder={tab === 'jobs' ? 'ค้นหาลูกค้า, เลขจอง, พนักงาน...' : 'ค้นหา...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors',
                tab === t.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              )}>
              {t.label}
              {t.count !== undefined && (
                <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-bold',
                  tab === t.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500')}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {tab === 'jobs' && <JobsTab search={search} />}
        {tab === 'workload' && <WorkloadTab />}
        {tab === 'issues' && <IssuesTab />}

        {tab === 'bookings' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <SortableHeader label="Ref" field="booking_ref" sort={sort} onSort={handleSort} />
                  <SortableHeader label="วันที่" field="requested_date" sort={sort} onSort={handleSort} />
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">สถานที่</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">ลูกค้า</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">ประเภทรถ</th>
                  <SortableHeader label="สถานะ" field="status" sort={sort} onSort={handleSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredBookings.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 font-mono text-xs font-semibold text-gray-700">{b.booking_ref}</td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">
                      {new Date(b.requested_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-3 py-3 text-gray-800 max-w-[140px] truncate text-xs">{b.site?.site_name ?? '–'}</td>
                    <td className="px-3 py-3 text-gray-700 text-xs">{b.customer ?? '–'}</td>
                    <td className="px-3 py-3 text-gray-600 text-xs">{b.vehicle_type}</td>
                    <td className="px-3 py-3"><Badge status={b.status} /></td>
                  </tr>
                ))}
                {filteredBookings.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-400">ไม่พบข้อมูล</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'drivers' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">ชื่อ</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">ประเภท</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">ใบขับขี่</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">เบอร์โทร</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">ADR</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredDrivers.map(d => {
                  const expired = d.adr_certificate_expiry && new Date(d.adr_certificate_expiry) < new Date();
                  return (
                    <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3 font-medium text-gray-900">{d.name}</td>
                      <td className="px-3 py-3 text-gray-600 text-xs">{d.driver_category}</td>
                      <td className="px-3 py-3 text-gray-600 text-xs">{d.license_type}</td>
                      <td className="px-3 py-3 text-gray-500 text-xs">{d.phone ?? '–'}</td>
                      <td className="px-3 py-3">
                        {d.adr_certificate_expiry
                          ? <span className={cn('text-xs', expired ? 'text-red-600 font-semibold' : 'text-gray-500')}>
                              {new Date(d.adr_certificate_expiry).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                              {expired && ' ⚠️'}
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
          </div>
        )}

        {tab === 'vehicles' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">ทะเบียน</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">ประเภท</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">เจ้าของ</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">พลังงาน</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Battery</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredVehicles.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 font-mono font-semibold text-gray-900">{v.plate_number}</td>
                    <td className="px-3 py-3 text-gray-600 text-xs">{v.vehicle_type}</td>
                    <td className="px-3 py-3 text-gray-600 text-xs">{v.ownership}</td>
                    <td className="px-3 py-3">
                      <span className={cn('text-xs font-semibold', v.powertrain === 'EV' ? 'text-emerald-600' : 'text-gray-500')}>
                        {v.powertrain === 'EV' ? '⚡ EV' : '⛽ Diesel'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {v.powertrain === 'EV' && v.battery_soc != null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full bg-gray-200 overflow-hidden">
                            <div className={cn('h-full rounded-full', v.battery_soc >= 50 ? 'bg-emerald-500' : v.battery_soc >= 20 ? 'bg-amber-400' : 'bg-red-500')}
                              style={{ width: `${v.battery_soc}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{v.battery_soc}%</span>
                        </div>
                      ) : <span className="text-gray-300 text-xs">–</span>}
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
          </div>
        )}
      </div>
    </div>
  );
}
