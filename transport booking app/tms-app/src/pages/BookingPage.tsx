import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { BookingWizard, type WizardState } from '@/components/booking/BookingWizard';
import { useCancelBooking } from '@/hooks/useBookings';
import { useRole } from '@/context/role';
import { TRUCK_TYPES } from '@/lib/reference-data';
import { cn } from '@/lib/utils';
import { CalendarPlus, LayoutDashboard, History, Truck, CheckCircle2, Clock, AlertTriangle, Trash2, Copy } from 'lucide-react';

// Booking row with the extra columns needed to re-create the wizard form
type HistoryRow = {
  id: string;
  booking_ref: string;
  requested_date: string;
  customer: string | null;
  vehicle_type: string;
  cargo_type: string;
  is_bpa_cargo: boolean;
  status: string;
  trip_count: number | null;
  loading_place: string | null;
  delivery_place: string | null;
  shift: string | null;
  csr_contact: string | null;
  is_round_trip: boolean | null;
  activity: string | null;
  site: { site_name: string } | null;
};

// Map a saved booking back into wizard form state (date intentionally left
// at today, so a frequent order is simply re-booked for a new day)
function bookingToWizardInit(b: HistoryRow): Partial<WizardState> {
  const truck = TRUCK_TYPES.find(t => t.category === b.vehicle_type)?.value ?? '';
  const shift = (b.shift as WizardState['shift']) ?? 'DAY';
  const n = b.trip_count ?? 0;
  return {
    shift,
    csr_contact: b.csr_contact ?? '',
    customer: b.customer ?? '',
    loading_place: b.loading_place ?? '',
    delivery_place: b.delivery_place ?? '',
    is_round_trip: !!b.is_round_trip,
    activity: b.activity ?? 'Transfer',
    truck_type: truck,
    day_trips:   shift === 'NIGHT' ? '' : (n ? String(n) : ''),
    night_trips: shift === 'NIGHT' ? (n ? String(n) : '') : '',
  };
}

// ── Admin dashboard stats ─────────────────────────────────────

function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    refetchInterval: 30_000,
    queryFn: async () => {
      const supabase = createClient();
      const today = new Date().toISOString().split('T')[0];
      const [bookings, todayPlans] = await Promise.all([
        supabase.from('bookings').select('id, status, requested_date'),
        supabase.from('daily_plans').select('id, status').eq('plan_date', today),
      ]);
      const bk = bookings.data ?? [];
      const pl = todayPlans.data ?? [];
      return {
        totalBookings:   bk.length,
        pendingBookings: bk.filter(b => b.status === 'Pending').length,
        confirmedBookings: bk.filter(b => b.status === 'Confirmed').length,
        todayBookings:   bk.filter(b => b.requested_date === today).length,
        todayDispatched: pl.filter(p => p.status === 'Dispatched').length,
        todayCompleted:  pl.filter(p => p.status === 'Completed').length,
        todayPending:    pl.filter(p => p.status === 'Draft').length,
      };
    },
  });
}

function useBookingHistory() {
  return useQuery({
    queryKey: ['admin-booking-history'],
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('bookings')
        .select(`
          id, booking_ref, requested_date, customer, vehicle_type,
          cargo_type, is_bpa_cargo, status, trip_count,
          loading_place, delivery_place, shift, csr_contact, is_round_trip, activity,
          site:sites!bookings_site_id_fkey(site_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as HistoryRow[];
    },
  });
}

// ── Status helpers ────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  Pending:   'bg-gray-100 text-gray-600',
  Confirmed: 'bg-blue-100 text-blue-700',
  Cancelled: 'bg-red-100 text-red-600',
};

function StatTile({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: number; sub?: string; color: string;
}) {
  return (
    <div className={cn('rounded-2xl p-4 text-white shadow-sm', color)}>
      <div className="mb-2 opacity-80">{icon}</div>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm mt-1 opacity-90 font-medium">{label}</p>
      {sub && <p className="text-xs mt-0.5 opacity-70">{sub}</p>}
    </div>
  );
}

// ── Dashboard Tab ─────────────────────────────────────────────

function DashboardTab() {
  const { data: stats, isLoading } = useAdminStats();
  const { displayName } = useRole();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-blue-600 px-5 py-5 text-white shadow-lg">
        <p className="text-xs text-blue-200 mb-0.5">สวัสดี Admin</p>
        <p className="text-xl font-bold">{displayName}</p>
        <p className="text-sm text-blue-200 mt-1">
          {new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : stats && (
        <>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">คำจองทั้งหมด</p>
            <div className="grid grid-cols-2 gap-3">
              <StatTile icon={<History className="h-5 w-5" />} label="คำจองทั้งหมด"
                value={stats.totalBookings} color="bg-blue-600" />
              <StatTile icon={<AlertTriangle className="h-5 w-5" />} label="รอดำเนินการ"
                value={stats.pendingBookings} sub={`ยืนยันแล้ว ${stats.confirmedBookings}`}
                color={stats.pendingBookings > 0 ? 'bg-amber-500' : 'bg-gray-500'} />
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">งานวันนี้</p>
            <div className="grid grid-cols-3 gap-3">
              <StatTile icon={<Truck className="h-5 w-5" />} label="จองวันนี้"
                value={stats.todayBookings} color="bg-indigo-600" />
              <StatTile icon={<Clock className="h-5 w-5" />} label="กำลังวิ่ง"
                value={stats.todayDispatched} color="bg-blue-500" />
              <StatTile icon={<CheckCircle2 className="h-5 w-5" />} label="เสร็จแล้ว"
                value={stats.todayCompleted} color="bg-emerald-600" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── History Tab ───────────────────────────────────────────────

function HistoryTab({ onDuplicate }: { onDuplicate: (b: HistoryRow) => void }) {
  const { data: bookings = [], isLoading } = useBookingHistory();
  const cancelBooking = useCancelBooking();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  function handleCancel(id: string) {
    if (confirmCancelId !== id) {
      setConfirmCancelId(id);
      return;
    }
    setConfirmCancelId(null);
    cancelBooking.mutate({ id });
  }

  const filtered = bookings.filter(b => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.booking_ref.toLowerCase().includes(q) ||
      (b.customer ?? '').toLowerCase().includes(q) ||
      b.site?.site_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="ค้นหาเลขจอง, ลูกค้า, สถานที่..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', 'Pending', 'Confirmed', 'Cancelled'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={cn(
              'rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors',
              statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            )}>
            {s === 'all' ? 'ทั้งหมด' : s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Ref</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">วันที่</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">ลูกค้า</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">รถ</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">สินค้า</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">สถานะ</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(b => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-3 font-mono text-xs font-semibold text-gray-700">{b.booking_ref}</td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">
                    {new Date(b.requested_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="px-3 py-3 text-gray-700 text-xs max-w-[120px] truncate">{b.customer ?? b.site?.site_name ?? '–'}</td>
                  <td className="px-3 py-3 text-gray-600 text-xs">{b.vehicle_type}</td>
                  <td className="px-3 py-3 text-gray-600 text-xs">
                    {b.cargo_type}
                    {b.is_bpa_cargo && <span className="ml-1 text-orange-500 font-semibold text-xs">BPA</span>}
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', STATUS_COLOR[b.status] ?? 'bg-gray-100 text-gray-600')}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => onDuplicate(b)}
                      title="ทำซ้ำการจองนี้"
                      className="rounded-lg px-2 py-1 text-[10px] font-semibold text-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    {b.status !== 'Cancelled' && (
                      <button
                        onClick={() => handleCancel(b.id)}
                        disabled={cancelBooking.isPending}
                        title="ยกเลิกการจอง"
                        className={cn(
                          'ml-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors disabled:opacity-40',
                          confirmCancelId === b.id
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'text-red-400 hover:bg-red-50 hover:text-red-600'
                        )}>
                        {confirmCancelId === b.id
                          ? 'ยืนยันยกเลิก?'
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-400">ไม่พบข้อมูล</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

type AdminTab = 'dashboard' | 'booking' | 'history';

export default function BookingPage() {
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [dupInit, setDupInit] = useState<Partial<WizardState> | null>(null);
  const [wizardKey, setWizardKey] = useState(0);

  // Duplicate a past booking → pre-fill a fresh wizard and jump to it
  const handleDuplicate = (b: HistoryRow) => {
    setDupInit(bookingToWizardInit(b));
    setWizardKey(k => k + 1);
    setTab('booking');
  };

  const TABS: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'สรุปงาน',  icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'booking',   label: 'จองรถ',    icon: <CalendarPlus className="h-4 w-4" /> },
    { id: 'history',   label: 'ประวัติจอง', icon: <History className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 to-white">
      <div className="mx-auto max-w-xl px-4 py-6 space-y-5">
        {/* Tab selector */}
        <div className="flex gap-2">
          {TABS.map(t => (
            <button key={t.id} onClick={() => {
                // Clicking "จองรถ" directly starts a fresh form
                if (t.id === 'booking') { setDupInit(null); setWizardKey(k => k + 1); }
                setTab(t.id);
              }}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors',
                tab === t.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              )}>
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'dashboard' && <DashboardTab />}

        {tab === 'booking' && (
          <>
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
                <span className="text-2xl">🚛</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{dupInit ? 'ทำซ้ำการจอง' : 'จองรถขนส่ง'}</h1>
              <p className="mt-1 text-sm text-gray-500">กรอกข้อมูลทีละขั้นตอน ใช้เวลาไม่ถึง 2 นาที</p>
            </div>
            {dupInit && (
              <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                <Copy className="h-4 w-4 shrink-0" />
                ทำซ้ำจากการจองเดิม — ตรวจสอบ/แก้ไขข้อมูล (วันที่ตั้งเป็นวันนี้ให้แล้ว) แล้วกดยืนยัน
              </div>
            )}
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
              <BookingWizard key={wizardKey} initial={dupInit ?? undefined} />
            </div>
          </>
        )}

        {tab === 'history' && <HistoryTab onDuplicate={handleDuplicate} />}
      </div>
    </div>
  );
}
