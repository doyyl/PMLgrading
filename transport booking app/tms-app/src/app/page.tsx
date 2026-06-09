'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CalendarPlus, MapPin, Activity, Leaf, AlertTriangle, ChevronRight, Truck, Clock, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const supabase = createClient();
      const today = new Date().toISOString().split('T')[0];
      const [bookings, dispatched, alerts] = await Promise.all([
        supabase.from('transport_plans').select('id', { count: 'exact', head: true }).eq('plan_date', today).eq('status', 'Draft'),
        supabase.from('transport_plans').select('id', { count: 'exact', head: true }).eq('plan_date', today).eq('status', 'Dispatched'),
        supabase.from('trip_events').select('id', { count: 'exact', head: true }).eq('acknowledged', false).in('severity', ['Critical', 'Warning']),
      ]);
      return {
        pending:    bookings.count  ?? 0,
        active:     dispatched.count ?? 0,
        alerts:     alerts.count   ?? 0,
      };
    },
    refetchInterval: 30_000,
  });
}

const QUICK_ACTIONS = [
  {
    href: '/booking',
    icon: '➕',
    bg: 'bg-blue-600',
    label: 'จองรถใหม่',
    sub: 'เพิ่มคำขอขนส่ง',
  },
  {
    href: '/planning',
    icon: '📋',
    bg: 'bg-indigo-600',
    label: 'วางแผนงาน',
    sub: 'มอบหมาย พขร. & รถ',
  },
  {
    href: '/tracking',
    icon: '📡',
    bg: 'bg-emerald-600',
    label: 'ติดตามรถ',
    sub: 'ดูสถานะเรียลไทม์',
  },
  {
    href: '/tracking/sustainability',
    icon: '🌿',
    bg: 'bg-teal-600',
    label: 'CO₂ / EV',
    sub: 'รายงานความยั่งยืน',
  },
];

function TodayBanner() {
  const { data: stats } = useDashboardStats();
  const dateStr = new Date().toLocaleDateString('th-TH', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="rounded-2xl bg-blue-600 px-5 py-5 text-white shadow-lg shadow-blue-200">
      <p className="text-xs font-medium text-blue-200 mb-1">{dateStr}</p>
      <p className="text-xl font-bold mb-4">สวัสดี, วันนี้มีงานอะไรบ้าง?</p>
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <Clock className="h-4 w-4" />, value: stats?.pending ?? '–', label: 'รอมอบหมาย', color: 'bg-blue-500' },
          { icon: <Truck className="h-4 w-4" />, value: stats?.active ?? '–', label: 'กำลังวิ่งงาน', color: 'bg-blue-500' },
          { icon: <AlertTriangle className="h-4 w-4" />, value: stats?.alerts ?? '–', label: 'แจ้งเตือนค้าง', color: stats?.alerts ? 'bg-red-500' : 'bg-blue-500' },
        ].map((s, i) => (
          <div key={i} className={`${s.color} rounded-xl px-3 py-3 text-center`}>
            <div className="flex justify-center mb-1 opacity-80">{s.icon}</div>
            <p className="text-2xl font-bold leading-none">{String(s.value)}</p>
            <p className="text-[11px] text-blue-100 mt-1 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-6 space-y-6">
      {/* Today banner */}
      <TodayBanner />

      {/* Quick actions */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">เมนูหลัก</p>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_ACTIONS.map(a => (
            <Link key={a.href} href={a.href}
              className="flex flex-col gap-3 rounded-2xl border-2 border-gray-100 bg-white p-4 shadow-sm hover:border-blue-200 hover:shadow-md transition-all active:scale-95">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${a.bg} text-2xl shadow-sm`}>
                {a.icon}
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{a.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{a.sub}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300 self-end mt-auto" />
            </Link>
          ))}
        </div>
      </div>

      {/* Status guide */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">สถานะงาน</p>
        {[
          { dot: 'bg-gray-400',   label: 'Draft',      th: 'รอมอบหมาย พขร. และรถ' },
          { dot: 'bg-amber-400',  label: 'Assigned',   th: 'มอบหมายแล้ว รอ Dispatch' },
          { dot: 'bg-blue-500',   label: 'Dispatched', th: 'รถออกวิ่งแล้ว' },
          { dot: 'bg-emerald-500',label: 'Completed',  th: 'ส่งงานสำเร็จ มี ePOD' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-3">
            <div className={`h-2.5 w-2.5 rounded-full ${s.dot} shrink-0`} />
            <span className="text-sm font-semibold text-gray-700 w-20">{s.label}</span>
            <span className="text-sm text-gray-500">{s.th}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
