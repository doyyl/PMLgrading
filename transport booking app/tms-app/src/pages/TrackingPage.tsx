import { useTrackingTrips, useDriverWorkload, type Trip } from '@/hooks/useTrips';
import { Truck, CheckCircle2, Clock, Play, Camera, Image as ImageIcon, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

// ── Helpers ───────────────────────────────────────────────────

const STATUS_COLOR: Record<Trip['status'], string> = {
  unassigned:  'bg-gray-100 text-gray-600',
  assigned:    'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-600',
};
const STATUS_LABEL: Record<Trip['status'], string> = {
  unassigned:  'รอมอบหมาย',
  assigned:    'มอบหมายแล้ว',
  in_progress: 'กำลังวิ่ง',
  completed:   'เสร็จแล้ว',
  cancelled:   'ยกเลิก',
};

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

// ── Driver status card ────────────────────────────────────────

function DriverStatus({ driverName, trips }: { driverName: string; trips: Trip[] }) {
  const inProgress = trips.find(t => t.status === 'in_progress');
  const completedCount = trips.filter(t => t.status === 'completed').length;
  const totalCount = trips.length;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
            {driverName.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{driverName}</p>
            <p className="text-[10px] text-gray-500">{completedCount}/{totalCount} เที่ยวเสร็จ</p>
          </div>
        </div>
        {inProgress ? (
          <div className="flex items-center gap-1 rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            กำลังวิ่ง
          </div>
        ) : completedCount === totalCount && totalCount > 0 ? (
          <div className="flex items-center gap-1 rounded-xl bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            เสร็จทั้งหมด
          </div>
        ) : (
          <div className="rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-500">
            ว่าง
          </div>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div>
          <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Trip list */}
      <div className="space-y-2">
        {trips.map(t => (
          <div key={t.id} className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white border border-gray-200 text-xs font-bold text-gray-600">
              {t.trip_number}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">
                {t.loading_place ?? '?'} → {t.destination ?? '?'}
              </p>
              <p className="text-[10px] text-gray-500">{t.customer}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {t.started_at && (
                <span className="flex items-center gap-1 text-[10px] text-blue-500">
                  <Play className="h-3 w-3" />{fmtTime(t.started_at)}
                </span>
              )}
              {t.completed_at && (
                <span className="flex items-center gap-1 text-[10px] text-green-600">
                  <CheckCircle2 className="h-3 w-3" />{fmtTime(t.completed_at)}
                </span>
              )}
              {t.close_photo_url && (
                <a href={t.close_photo_url} target="_blank" rel="noreferrer"
                  className="text-[10px] text-blue-400 flex items-center gap-0.5">
                  <ImageIcon className="h-3 w-3" />
                </a>
              )}
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', STATUS_COLOR[t.status])}>
                {STATUS_LABEL[t.status]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Workload tab ──────────────────────────────────────────────

function WorkloadTab() {
  const { data: workload = [], isLoading } = useDriverWorkload();

  if (isLoading) return (
    <div className="space-y-3">
      {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}
    </div>
  );

  if (workload.length === 0) return (
    <div className="py-12 text-center text-sm text-gray-400">ยังไม่มีข้อมูลภาระงาน</div>
  );

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500">พขร.</th>
            <th className="px-4 py-2.5 text-center text-xs font-bold text-gray-500">รวม</th>
            <th className="px-4 py-2.5 text-center text-xs font-bold text-amber-600">วิ่ง</th>
            <th className="px-4 py-2.5 text-center text-xs font-bold text-green-600">เสร็จ</th>
            <th className="px-4 py-2.5 text-center text-xs font-bold text-blue-600">มอบ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {workload.map(w => (
            <tr key={w.driver.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-semibold text-gray-800">{w.driver.name}</td>
              <td className="px-4 py-3 text-center font-bold text-gray-700">{w.total}</td>
              <td className="px-4 py-3 text-center text-amber-600 font-semibold">{w.inProgress}</td>
              <td className="px-4 py-3 text-center text-green-600 font-semibold">{w.completed}</td>
              <td className="px-4 py-3 text-center text-blue-600 font-semibold">{w.assigned}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function TrackingPage() {
  const { data: trips = [], isLoading } = useTrackingTrips();
  const [tab, setTab] = useState<'status' | 'workload'>('status');

  const today = new Date().toISOString().split('T')[0];
  const inProgressCount = trips.filter(t => t.status === 'in_progress').length;
  const completedCount  = trips.filter(t => t.status === 'completed').length;

  // Group trips by driver
  const driverMap = new Map<string, { name: string; trips: Trip[] }>();
  for (const t of trips) {
    const id   = t.driver?.id ?? '__no_driver__';
    const name = t.driver?.name ?? 'ไม่ระบุ';
    if (!driverMap.has(id)) driverMap.set(id, { name, trips: [] });
    driverMap.get(id)!.trips.push(t);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 to-white">
      <div className="mx-auto max-w-xl px-4 py-6 space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">การติดตามรถ</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {today} · กำลังวิ่ง {inProgressCount} เที่ยว · เสร็จ {completedCount} เที่ยว
          </p>
        </div>

        {/* Summary tiles */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-amber-100 text-amber-700 p-3 text-center">
            <Truck className="h-5 w-5 mx-auto mb-1 opacity-70" />
            <p className="text-2xl font-bold">{inProgressCount}</p>
            <p className="text-[10px] font-semibold">กำลังวิ่ง</p>
          </div>
          <div className="rounded-2xl bg-blue-100 text-blue-700 p-3 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 opacity-70" />
            <p className="text-2xl font-bold">{trips.filter(t => t.status === 'assigned').length}</p>
            <p className="text-[10px] font-semibold">มอบหมายแล้ว</p>
          </div>
          <div className="rounded-2xl bg-green-100 text-green-700 p-3 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto mb-1 opacity-70" />
            <p className="text-2xl font-bold">{completedCount}</p>
            <p className="text-[10px] font-semibold">เสร็จวันนี้</p>
          </div>
        </div>

        {/* Tab selector */}
        <div className="flex gap-2">
          <button onClick={() => setTab('status')}
            className={cn(
              'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors',
              tab === 'status' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            )}>
            <Truck className="h-4 w-4 inline mr-1" />
            สถานะรายคน
          </button>
          <button onClick={() => setTab('workload')}
            className={cn(
              'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors',
              tab === 'workload' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            )}>
            <Users className="h-4 w-4 inline mr-1" />
            ภาระงาน
          </button>
        </div>

        {/* Content */}
        {tab === 'status' && (
          isLoading ? (
            <div className="space-y-3">
              {[1,2].map(i => <div key={i} className="h-32 rounded-2xl bg-gray-100 animate-pulse" />)}
            </div>
          ) : driverMap.size === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-gray-400">
              <Truck className="h-10 w-10" />
              <p className="text-sm">ยังไม่มีรถออกวิ่งวันนี้</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from(driverMap.entries()).map(([id, { name, trips: ts }]) => (
                <DriverStatus key={id} driverName={name} trips={ts} />
              ))}
            </div>
          )
        )}

        {tab === 'workload' && <WorkloadTab />}
      </div>
    </div>
  );
}
