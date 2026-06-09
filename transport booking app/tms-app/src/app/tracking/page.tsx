'use client';

import { useState } from 'react';
import { Truck, CheckCircle2, ChevronRight, Activity } from 'lucide-react';
import { useActivePlans, useTripEvents, useLiveEvents } from '@/hooks/useTracking';
import { useTrackingStore } from '@/store/trackingStore';
import { cn, getStatusColor } from '@/lib/utils';
import type { DailyPlan } from '@/types';

function SeverityDot({ s }: { s: string }) {
  return (
    <div className={cn('h-2.5 w-2.5 rounded-full shrink-0',
      s === 'Critical' ? 'bg-red-500 animate-pulse' :
      s === 'Warning'  ? 'bg-amber-400' : 'bg-blue-300')} />
  );
}

function TripRow({ plan, selected, onSelect }: {
  plan: DailyPlan; selected: boolean; onSelect: () => void;
}) {
  return (
    <button type="button" onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-4 text-left transition-colors border-b border-gray-100 last:border-0',
        selected ? 'bg-blue-50' : 'hover:bg-gray-50'
      )}>
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
        plan.status === 'Dispatched' ? 'bg-blue-100' :
        plan.status === 'Completed'  ? 'bg-emerald-100' : 'bg-gray-100')}>
        <Truck className={cn('h-4 w-4',
          plan.status === 'Dispatched' ? 'text-blue-600' :
          plan.status === 'Completed'  ? 'text-emerald-600' : 'text-gray-400')} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-gray-900 truncate">{plan.booking?.booking_ref ?? plan.id.slice(0,8)}</p>
        <p className="text-xs text-gray-500 truncate">
          {plan.driver?.name ?? 'ยังไม่มอบหมาย'} · {plan.vehicle?.plate_number ?? '—'}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(plan.status))}>
          {plan.status}
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
      </div>
    </button>
  );
}

function EventDetail({ planId }: { planId: string }) {
  const { data: events = [] } = useTripEvents(planId);
  useLiveEvents(planId);

  if (!planId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400 gap-3">
        <Activity className="h-10 w-10 text-gray-200" />
        <p className="text-sm">เลือกรถจากรายการ<br />เพื่อดู telematics events</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400 gap-2">
        <CheckCircle2 className="h-8 w-8 text-emerald-300" />
        <p className="text-sm">ไม่มีเหตุการณ์ผิดปกติ</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {events.map(ev => (
        <div key={ev.id} className="flex items-start gap-3 px-4 py-3">
          <SeverityDot s={ev.severity} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">{ev.event_type}</p>
            {ev.description && <p className="text-xs text-gray-500 mt-0.5">{ev.description}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-gray-400">
              {new Date(ev.recorded_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
            </p>
            {!ev.acknowledged && (
              <span className="text-[10px] font-semibold text-red-500">ยังไม่รับทราบ</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TrackingPage() {
  const today = new Date().toISOString().split('T')[0];
  const { data: plans = [], isLoading } = useActivePlans(today);
  const { selectedPlan, selectPlan } = useTrackingStore();
  const [tab, setTab] = useState<'trips' | 'events'>('trips');

  const activeCount    = plans.filter(p => p.status === 'Dispatched').length;
  const completedCount = plans.filter(p => p.status === 'Completed').length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">ติดตามรถ</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {today} · กำลังวิ่ง {activeCount} คัน · เสร็จแล้ว {completedCount} คัน
        </p>
      </div>

      {/* Mobile tab toggle */}
      <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
        {(['trips', 'events'] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={cn('flex-1 rounded-lg py-2 text-sm font-semibold transition-colors',
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}>
            {t === 'trips' ? `🚛 รายการรถ (${plans.length})` : `📡 Events${selectedPlan ? ` — ${selectedPlan.booking?.booking_ref ?? ''}` : ''}`}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        {tab === 'trips' && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
                <span className="animate-pulse">กำลังโหลด…</span>
              </div>
            ) : plans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400 gap-2">
                <Truck className="h-10 w-10 text-gray-200" />
                <p className="text-sm">ยังไม่มีรถ Dispatch วันนี้</p>
              </div>
            ) : (
              <div>
                {plans.map(plan => (
                  <TripRow key={plan.id} plan={plan}
                    selected={selectedPlan?.id === plan.id}
                    onSelect={() => { selectPlan(plan); setTab('events'); }} />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'events' && (
          <EventDetail planId={selectedPlan?.id ?? ''} />
        )}
      </div>
    </div>
  );
}
