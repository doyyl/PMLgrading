'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useRole } from '@/context/role';
import type { Driver, DailyPlan, DriverShift } from '@/types';
import { Truck, Calendar, Clock, MapPin, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

function useDrivers() {
  return useQuery({
    queryKey: ['drivers-list'],
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('drivers')
        .select('*')
        .eq('active', true)
        .order('name');
      if (error) throw new Error(error.message);
      return data as Driver[];
    },
  });
}

function useDriverShifts(driverId: string | null) {
  const today = new Date().toISOString().split('T')[0];
  const weekEnd = new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0];

  return useQuery({
    queryKey: ['driver-shifts', driverId],
    enabled: !!driverId,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('driver_shifts')
        .select('*')
        .eq('driver_id', driverId!)
        .gte('shift_date', today)
        .lte('shift_date', weekEnd)
        .order('shift_date');
      if (error) throw new Error(error.message);
      return data as DriverShift[];
    },
  });
}

function useDriverPlans(driverId: string | null) {
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['driver-plans', driverId],
    enabled: !!driverId,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('transport_plans')
        .select(`
          *,
          booking:bookings!transport_plans_booking_id_fkey(*, site:sites!bookings_site_id_fkey(*)),
          vehicle:vehicles(*)
        `)
        .eq('driver_id', driverId!)
        .gte('plan_date', today)
        .order('plan_date');
      if (error) throw new Error(error.message);
      return data as DailyPlan[];
    },
  });
}

const SHIFT_COLOR: Record<string, string> = {
  Day:   'bg-amber-100 text-amber-700 border-amber-200',
  Night: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  Off:   'bg-gray-100 text-gray-500 border-gray-200',
};

const STATUS_COLOR: Record<string, string> = {
  Draft:      'bg-gray-100 text-gray-600',
  Assigned:   'bg-amber-100 text-amber-700',
  Dispatched: 'bg-blue-100 text-blue-700',
  Completed:  'bg-emerald-100 text-emerald-700',
  Cancelled:  'bg-red-100 text-red-600',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('th-TH', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

function DriverSelector({ onSelect }: { onSelect: (id: string, name: string) => void }) {
  const { data: drivers, isLoading } = useDrivers();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 to-white px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-3xl shadow-lg">
            🚛
          </div>
          <h1 className="text-xl font-bold text-gray-900">เลือกชื่อพนักงานขับรถ</h1>
          <p className="mt-1 text-sm text-gray-500">เพื่อดูตารางงานของคุณ</p>
        </div>

        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex w-full items-center justify-between rounded-2xl border-2 border-gray-200 bg-white px-4 py-4 text-left shadow-sm hover:border-emerald-400 transition-colors"
          >
            <span className="text-gray-500">{isLoading ? 'กำลังโหลด...' : 'เลือกชื่อของคุณ...'}</span>
            <ChevronDown className={cn('h-5 w-5 text-gray-400 transition-transform', open && 'rotate-180')} />
          </button>

          {open && drivers && (
            <div className="absolute z-10 mt-2 w-full rounded-2xl border border-gray-100 bg-white shadow-xl overflow-hidden">
              <div className="max-h-72 overflow-y-auto py-2">
                {drivers.map(d => (
                  <button
                    key={d.id}
                    onClick={() => { onSelect(d.id, d.name); setOpen(false); }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-emerald-50 transition-colors"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 shrink-0">
                      {d.name.slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{d.name}</p>
                      <p className="text-xs text-gray-400">{d.driver_category} · {d.license_type}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DriverPage() {
  const { driverId, driverName, setDriverIdentity } = useRole();
  const { data: shifts, isLoading: shiftsLoading } = useDriverShifts(driverId);
  const { data: plans, isLoading: plansLoading } = useDriverPlans(driverId);

  if (!driverId) {
    return <DriverSelector onSelect={setDriverIdentity} />;
  }

  const today = new Date().toISOString().split('T')[0];
  const todayShift = shifts?.find(s => s.shift_date === today);
  const todayPlans = plans?.filter(p => p.plan_date === today) ?? [];
  const upcomingPlans = plans?.filter(p => p.plan_date > today) ?? [];

  return (
    <div className="mx-auto max-w-xl px-4 py-6 space-y-6">
      {/* Driver greeting */}
      <div className="rounded-2xl bg-emerald-600 px-5 py-5 text-white shadow-lg shadow-emerald-100">
        <p className="text-xs text-emerald-200 mb-1">สวัสดี</p>
        <p className="text-xl font-bold">{driverName}</p>
        <p className="text-sm text-emerald-200 mt-1">
          {new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        <div className="mt-4 flex gap-3">
          <div className="flex-1 rounded-xl bg-emerald-500 px-3 py-3 text-center">
            <p className="text-2xl font-bold">{todayPlans.length}</p>
            <p className="text-xs text-emerald-100 mt-0.5">งานวันนี้</p>
          </div>
          <div className="flex-1 rounded-xl bg-emerald-500 px-3 py-3 text-center">
            <p className="text-2xl font-bold">{upcomingPlans.length}</p>
            <p className="text-xs text-emerald-100 mt-0.5">งานที่จะมาถึง</p>
          </div>
          <div className="flex-1 rounded-xl bg-emerald-500 px-3 py-3 text-center">
            <p className="text-xl font-bold">{todayShift ? todayShift.shift_type : '–'}</p>
            <p className="text-xs text-emerald-100 mt-0.5">กะวันนี้</p>
          </div>
        </div>
      </div>

      {/* Today's shift detail */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">กะงานวันนี้</p>
        {shiftsLoading ? (
          <div className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
        ) : todayShift ? (
          <div className={cn('flex items-center gap-4 rounded-2xl border-2 bg-white px-5 py-4 shadow-sm', SHIFT_COLOR[todayShift.shift_type])}>
            <Clock className="h-8 w-8 shrink-0" />
            <div>
              <p className="font-bold text-lg">{todayShift.shift_type === 'Day' ? 'กะกลางวัน' : todayShift.shift_type === 'Night' ? 'กะกลางคืน' : 'วันหยุด'}</p>
              {todayShift.start_time && todayShift.end_time && (
                <p className="text-sm opacity-80">{todayShift.start_time} – {todayShift.end_time} น.</p>
              )}
              {todayShift.notes && <p className="text-xs opacity-60 mt-1">{todayShift.notes}</p>}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-5 text-gray-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">ไม่มีตารางกะสำหรับวันนี้</p>
          </div>
        )}
      </div>

      {/* This week's shifts */}
      {shifts && shifts.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">ตารางกะ 7 วัน</p>
          <div className="grid grid-cols-1 gap-2">
            {shifts.map(s => (
              <div key={s.id} className={cn(
                'flex items-center justify-between rounded-xl border px-4 py-3 text-sm',
                SHIFT_COLOR[s.shift_type]
              )}>
                <span className="font-medium">{formatDate(s.shift_date)}</span>
                <div className="flex items-center gap-2">
                  {s.start_time && <span className="opacity-70">{s.start_time}–{s.end_time}</span>}
                  <span className="font-semibold">
                    {s.shift_type === 'Day' ? '☀️ กลางวัน' : s.shift_type === 'Night' ? '🌙 กลางคืน' : '🔴 หยุด'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's trips */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">งานวันนี้</p>
        {plansLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />)}
          </div>
        ) : todayPlans.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-5 text-gray-400">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p className="text-sm">ยังไม่มีงานที่มอบหมายวันนี้</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayPlans.map(plan => (
              <TripCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </div>

      {/* Upcoming trips */}
      {upcomingPlans.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">งานที่จะมาถึง</p>
          <div className="space-y-3">
            {upcomingPlans.map(plan => (
              <TripCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>
      )}

      {/* Change driver */}
      <button
        onClick={() => { localStorage.removeItem('tms_driver_id'); localStorage.removeItem('tms_driver_name'); window.location.reload(); }}
        className="w-full rounded-2xl border border-gray-200 py-3 text-sm text-gray-400 hover:bg-gray-50 transition-colors"
      >
        เปลี่ยนชื่อพนักงานขับรถ
      </button>
    </div>
  );
}

function TripCard({ plan }: { plan: DailyPlan }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-gray-400 shrink-0" />
          <p className="font-semibold text-gray-900 text-sm">{plan.booking?.booking_ref ?? plan.id.slice(0, 8)}</p>
        </div>
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', STATUS_COLOR[plan.status])}>
          {plan.status}
        </span>
      </div>

      <div className="space-y-1.5 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <span>{plan.booking?.site?.site_name ?? '–'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <span>{formatDate(plan.plan_date)}</span>
        </div>
        {plan.vehicle && (
          <div className="flex items-center gap-2">
            <Truck className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span>{plan.vehicle.plate_number} · {plan.vehicle.vehicle_type}</span>
          </div>
        )}
      </div>

      {plan.dispatch_notes && (
        <p className="text-xs text-gray-400 border-t border-gray-100 pt-2">{plan.dispatch_notes}</p>
      )}
    </div>
  );
}
