import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useRole } from '@/context/role';
import {
  useAllTrips, usePlanningStats, useAssignTrip,
  useUnassignTrip, useCancelTrip, useDriverDayLoad,
  useBulkAssignTrips, useDriversOnShift,
  isDriverBpaQualified, type Trip,
} from '@/hooks/useTrips';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  Truck, CheckCircle2, AlertCircle,
  ChevronDown, ChevronRight, UserCheck, CalendarDays,
  MapPin, RefreshCw, RotateCcw, UserMinus, Trash2,
  CheckSquare, Square, ListChecks, Moon, Sun,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────

const STATUS_LABEL: Record<Trip['status'], string> = {
  unassigned:  'รอมอบหมาย',
  assigned:    'มอบหมายแล้ว',
  in_progress: 'กำลังวิ่ง',
  completed:   'เสร็จแล้ว',
  cancelled:   'ยกเลิก',
};

const STATUS_PILL: Record<Trip['status'], string> = {
  unassigned:  'bg-gray-100 text-gray-600 border border-gray-200',
  assigned:    'bg-blue-50 text-blue-700 border border-blue-200',
  in_progress: 'bg-amber-50 text-amber-700 border border-amber-200',
  completed:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  cancelled:   'bg-red-50 text-red-600 border border-red-200',
};

const STATUS_DOT: Record<Trip['status'], string> = {
  unassigned:  'bg-gray-400',
  assigned:    'bg-blue-500',
  in_progress: 'bg-amber-500 animate-pulse',
  completed:   'bg-emerald-500',
  cancelled:   'bg-red-400',
};

function todayStr() {
  return new Date().toISOString().split('T')[0];
}
function tomorrowStr() {
  const d = new Date(Date.now() + 86400000);
  return d.toISOString().split('T')[0];
}
function fmtShort(date: string | null) {
  if (!date) return '–';
  return new Date(date).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' });
}
function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

// ── Stats bar ─────────────────────────────────────────────────

function StatsBar({ trips }: { trips: Trip[] }) {
  const { data: stats } = usePlanningStats();
  const today = todayStr();

  const todayTrips   = trips.filter(t => t.scheduled_date === today);
  const unassigned   = trips.filter(t => t.status === 'unassigned').length;
  const inProg       = todayTrips.filter(t => t.status === 'in_progress').length;
  const done         = todayTrips.filter(t => t.status === 'completed').length;
  const totalBooking = stats?.totalBookings ?? 0;

  return (
    <div className="grid grid-cols-4 gap-2">
      {[
        { label: 'คำจองรวม',   value: totalBooking, icon: <CalendarDays className="h-4 w-4" />, color: 'bg-blue-600 text-white' },
        { label: 'รอมอบหมาย', value: unassigned,    icon: <AlertCircle className="h-4 w-4" />,  color: unassigned > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500' },
        { label: 'วิ่งวันนี้',  value: inProg,       icon: <Truck className="h-4 w-4" />,        color: 'bg-amber-100 text-amber-700' },
        { label: 'เสร็จวันนี้', value: done,         icon: <CheckCircle2 className="h-4 w-4" />, color: 'bg-emerald-100 text-emerald-700' },
      ].map(s => (
        <div key={s.label} className={cn('rounded-2xl p-3 space-y-1', s.color)}>
          <div className="opacity-80">{s.icon}</div>
          <p className="text-2xl font-bold leading-none">{s.value}</p>
          <p className="text-[10px] font-semibold leading-tight">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Assign / Reassign modal ───────────────────────────────────

type DriverOption = {
  id: string;
  name: string;
  license_type?: string | null;
  adr_certificate_expiry?: string | null;
};

type VehicleOption = {
  id: string;
  plate_number: string;
  vehicle_type: string;
  powertrain: string;
  battery_soc: number | null;
  ownership: string;
};

// Shared driver list — shows BPA eligibility, day-load, and shift status
function DriverPicker({ drivers, selected, onSelect, dayLoad, onShift, isBpa }: {
  drivers: DriverOption[];
  selected: string;
  onSelect: (id: string) => void;
  dayLoad?: Map<string, number>;
  onShift?: Map<string, string>;
  isBpa: boolean;
}) {
  const hasShiftData = !!onShift && onShift.size > 0;
  const ordered = hasShiftData
    ? [...drivers].sort((a, b) => (onShift!.has(b.id) ? 1 : 0) - (onShift!.has(a.id) ? 1 : 0))
    : drivers;

  return (
    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
      {ordered.map(d => {
        const load = dayLoad?.get(d.id) ?? 0;
        const blocked = isBpa && !isDriverBpaQualified(d);
        const shift = onShift?.get(d.id);
        const offShift = hasShiftData && !shift;
        return (
          <button key={d.id} onClick={() => !blocked && onSelect(d.id)}
            disabled={blocked}
            className={cn(
              'w-full flex items-center gap-3 rounded-xl border-2 px-4 py-2.5 text-sm font-medium text-left transition-all',
              blocked
                ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                : selected === d.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-blue-200 hover:bg-blue-50/50'
            )}>
            <div className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
              blocked ? 'bg-gray-100 text-gray-300' : selected === d.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            )}>
              {d.name.charAt(0)}
            </div>
            <span className="flex-1 truncate">
              {d.name}
              {blocked && <span className="block text-[9px] text-red-400 font-normal">ไม่มี ท.4/ADR หรือหมดอายุ</span>}
            </span>
            {shift && (
              <span className="flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 shrink-0">
                {shift === 'Night' ? <Moon className="h-2.5 w-2.5" /> : <Sun className="h-2.5 w-2.5" />}
                {shift === 'Night' ? 'กะดึก' : 'กะวัน'}
              </span>
            )}
            {offShift && (
              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-400 shrink-0">ไม่ขึ้นกะ</span>
            )}
            <span className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0',
              blocked ? 'bg-gray-100 text-gray-300' :
              load === 0 ? 'bg-emerald-100 text-emerald-700' : load >= 4 ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-600'
            )}>
              {load === 0 ? 'ว่าง' : `${load} เที่ยว`}
            </span>
            {selected === d.id && !blocked && (
              <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// Shared vehicle selector — grouped by ownership (KNS vs Subcontractor)
function VehicleSelect({ vehicles, value, onChange }: {
  vehicles: VehicleOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  const kns = vehicles.filter(v => v.ownership === 'KNS');
  const sub = vehicles.filter(v => v.ownership === 'Subcontract');
  const opt = (v: VehicleOption) => (
    <option key={v.id} value={v.id}>
      {v.plate_number} · {v.vehicle_type}
      {v.powertrain === 'EV' ? ` · ⚡EV${v.battery_soc != null ? ` ${v.battery_soc}%` : ''}` : ''}
    </option>
  );
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none">
      <option value="">— ยังไม่ระบุรถ —</option>
      {kns.length > 0 && <optgroup label="🏢 KNS (รถบริษัท)">{kns.map(opt)}</optgroup>}
      {sub.length > 0 && <optgroup label="🤝 Subcontractor (รถผู้รับเหมา)">{sub.map(opt)}</optgroup>}
    </select>
  );
}

type AssignMode = 'kns' | 'sub';
type ShiftFilter = 'all' | 'Day' | 'Night';

function AssignModal({ trip, drivers, vehicles, onClose }: {
  trip: Trip;
  drivers: DriverOption[];
  vehicles: VehicleOption[];
  onClose: () => void;
}) {
  const assignTrip = useAssignTrip();
  const unassignTrip = useUnassignTrip();
  const cancelTrip = useCancelTrip();
  const { data: dayLoad } = useDriverDayLoad(trip.scheduled_date);
  const { data: onShift } = useDriversOnShift(trip.scheduled_date);
  const [selected, setSelected] = useState(trip.driver?.id ?? '');
  const [vehicleId, setVehicleId] = useState(trip.vehicle_id ?? '');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [assignMode, setAssignMode] = useState<AssignMode>('kns');
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>('all');
  const [contractorName, setContractorName] = useState('');
  const isReassign = !!trip.driver;
  const isBpa = !!trip.booking?.is_bpa_cargo;
  const busy = assignTrip.isPending || unassignTrip.isPending || cancelTrip.isPending;

  // KNS: filter by selected shift
  const driversForShift = assignMode === 'kns' && shiftFilter !== 'all' && onShift
    ? drivers.filter(d => onShift.get(d.id) === shiftFilter)
    : drivers;

  // Sub Contractor: only subcontract vehicles
  const subVehicles = vehicles.filter(v => v.ownership === 'Subcontract');

  const confirmDisabled = assignMode === 'kns' ? !selected : !vehicleId;

  async function confirm() {
    if (confirmDisabled) return;
    try {
      await assignTrip.mutateAsync({
        tripId: trip.id,
        driverId: assignMode === 'sub' ? null : selected,
        vehicleId: vehicleId || null,
      });
      if (assignMode === 'sub') {
        toast.success(`มอบหมาย Sub Contractor${contractorName ? ` (${contractorName})` : ''} สำเร็จ`);
      } else {
        toast.success(isReassign ? 'เปลี่ยนพนักงานสำเร็จ' : 'มอบหมายงานสำเร็จ');
      }
      onClose();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
  }

  async function handleUnassign() {
    try {
      await unassignTrip.mutateAsync({ tripId: trip.id });
      toast.success('ถอนการมอบหมายแล้ว — งานกลับไปรอมอบหมาย');
      onClose();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
  }

  async function handleCancel() {
    try {
      await cancelTrip.mutateAsync({ tripId: trip.id });
      toast.success(`ยกเลิกเที่ยวที่ ${trip.trip_number} แล้ว`);
      onClose();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 space-y-5 shadow-2xl">
        {/* Trip info */}
        <div className="space-y-1">
          <p className="text-base font-bold text-gray-900">
            {isReassign ? 'เปลี่ยนพนักงาน' : 'มอบหมายงาน'}
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-700 font-semibold">
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-600">
              เที่ยว {trip.trip_number}
            </span>
            <span>{trip.customer ?? 'ไม่ระบุลูกค้า'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
            {trip.loading_place ?? '?'} → {trip.destination ?? '?'}
          </div>
          <p className="text-xs text-gray-400">{fmtShort(trip.scheduled_date)}</p>
        </div>

        {/* Current driver if reassigning */}
        {isReassign && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-700">
            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            ปัจจุบัน: <strong>{trip.driver?.name}</strong>
          </div>
        )}

        {/* Assignment mode toggle */}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden">
          <button onClick={() => setAssignMode('kns')}
            className={cn('flex-1 py-2 text-xs font-semibold transition-colors',
              assignMode === 'kns' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50')}>
            🏢 KNS (รถบริษัท)
          </button>
          <button onClick={() => setAssignMode('sub')}
            className={cn('flex-1 py-2 text-xs font-semibold border-l border-gray-200 transition-colors',
              assignMode === 'sub' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50')}>
            🤝 Sub Contractor
          </button>
        </div>

        {/* KNS mode: shift filter + driver picker */}
        {assignMode === 'kns' && (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600">กรองตามกะ (เลือก OP ก่อน)</label>
              {/* TODO: link with MAS for live shift data */}
              <div className="flex gap-2">
                {([
                  { value: 'all',   label: 'ทั้งหมด' },
                  { value: 'Day',   label: '☀️ กะวัน' },
                  { value: 'Night', label: '🌙 กะดึก' },
                ] as { value: ShiftFilter; label: string }[]).map(s => (
                  <button key={s.value} onClick={() => setShiftFilter(s.value)}
                    className={cn(
                      'rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors',
                      shiftFilter === s.value
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600">
                {isReassign ? 'เปลี่ยนเป็น' : 'เลือกพนักงานขับรถ (OP)'}
              </label>
              {isBpa && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-700 font-medium">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  สินค้า BPA — เลือกได้เฉพาะ พขร. ใบ ท.4 + ADR ที่ยังไม่หมดอายุ
                </div>
              )}
              <DriverPicker drivers={driversForShift} selected={selected} onSelect={setSelected}
                dayLoad={dayLoad} onShift={onShift} isBpa={isBpa} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600">รถ KNS (ไม่บังคับ)</label>
              <VehicleSelect vehicles={vehicles.filter(v => v.ownership === 'KNS')} value={vehicleId} onChange={setVehicleId} />
            </div>
          </>
        )}

        {/* Sub Contractor mode: vehicle + optional company name */}
        {assignMode === 'sub' && (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600">รถผู้รับเหมา <span className="text-red-500">*</span></label>
              {subVehicles.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 px-4 py-3 text-xs text-gray-400 text-center">
                  ไม่พบรถผู้รับเหมาในระบบ
                </p>
              ) : (
                <VehicleSelect vehicles={subVehicles} value={vehicleId} onChange={setVehicleId} />
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600">ชื่อบริษัทผู้รับเหมา (ไม่บังคับ)</label>
              <input
                type="text"
                value={contractorName}
                onChange={e => setContractorName(e.target.value)}
                placeholder="เช่น บ. ขนส่งไทย จำกัด"
                className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </>
        )}

        {/* Unassign / cancel */}
        <div className="flex gap-2">
          {isReassign && trip.status === 'assigned' && (
            <button onClick={handleUnassign} disabled={busy}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-40">
              <UserMinus className="h-3.5 w-3.5" />
              ถอนมอบหมาย
            </button>
          )}
          {!confirmCancel ? (
            <button onClick={() => setConfirmCancel(true)} disabled={busy}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-40">
              <Trash2 className="h-3.5 w-3.5" />
              ยกเลิกเที่ยวนี้
            </button>
          ) : (
            <button onClick={handleCancel} disabled={busy}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-40">
              <Trash2 className="h-3.5 w-3.5" />
              กดอีกครั้งเพื่อยืนยันยกเลิก
            </button>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            ยกเลิก
          </button>
          <button onClick={confirm} disabled={confirmDisabled || assignTrip.isPending}
            className={cn(
              'flex-1 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-40 transition-colors',
              assignMode === 'sub' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
            )}>
            {assignTrip.isPending
              ? <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  กำลังบันทึก
                </span>
              : assignMode === 'sub'
                ? 'มอบหมาย Sub Contractor'
                : isReassign ? 'เปลี่ยนพนักงาน' : 'มอบหมาย'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Bulk assign modal (many trips → one driver) ───────────────

function BulkAssignModal({ trips, drivers, vehicles, onClose }: {
  trips: Trip[];
  drivers: DriverOption[];
  vehicles: VehicleOption[];
  onClose: () => void;
}) {
  const bulkAssign = useBulkAssignTrips();
  const shiftDate = trips[0]?.scheduled_date ?? null;
  const { data: dayLoad } = useDriverDayLoad(shiftDate);
  const { data: onShift } = useDriversOnShift(shiftDate);
  const [selected, setSelected] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const isBpa = trips.some(t => !!t.booking?.is_bpa_cargo);
  const multiDate = new Set(trips.map(t => t.scheduled_date).filter(Boolean)).size > 1;

  async function confirm() {
    if (!selected) return;
    try {
      await bulkAssign.mutateAsync({ tripIds: trips.map(t => t.id), driverId: selected, vehicleId: vehicleId || null });
      toast.success(`มอบหมาย ${trips.length} เที่ยวให้ ${drivers.find(d => d.id === selected)?.name ?? ''} แล้ว`);
      onClose();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="space-y-1">
          <p className="text-base font-bold text-gray-900">มอบหมายหลายเที่ยวพร้อมกัน</p>
          <p className="text-sm text-gray-500">{trips.length} เที่ยว → พนักงาน 1 คน</p>
        </div>

        {/* Selected trips summary */}
        <div className="rounded-xl bg-gray-50 border border-gray-100 divide-y divide-gray-100 max-h-32 overflow-y-auto">
          {trips.map(t => (
            <div key={t.id} className="flex items-center gap-2 px-3 py-1.5 text-xs">
              <span className="rounded-full bg-gray-200 px-1.5 py-0.5 font-bold text-gray-600">{t.trip_number}</span>
              <span className="font-semibold text-gray-700 truncate">{t.customer ?? 'ไม่ระบุ'}</span>
              <span className="text-gray-400 truncate ml-auto">{t.loading_place ?? '?'}→{t.destination ?? '?'}</span>
            </div>
          ))}
        </div>

        {multiDate && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-700">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            งานที่เลือกอยู่คนละวัน — สถานะกะ/ภาระงานอ้างอิงวันแรก
          </div>
        )}

        {/* Driver selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-600">เลือกพนักงานขับรถ (เลือกตามกะได้)</label>
          {isBpa && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-700 font-medium">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              มีงาน BPA — เลือกได้เฉพาะ พขร. ใบ ท.4 + ADR ที่ยังไม่หมดอายุ
            </div>
          )}
          <DriverPicker drivers={drivers} selected={selected} onSelect={setSelected}
            dayLoad={dayLoad} onShift={onShift} isBpa={isBpa} />
        </div>

        {/* Vehicle selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-600">รถ (ไม่บังคับ) — KNS / Subcontractor</label>
          <VehicleSelect vehicles={vehicles} value={vehicleId} onChange={setVehicleId} />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            ยกเลิก
          </button>
          <button onClick={confirm} disabled={!selected || bulkAssign.isPending}
            className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors">
            {bulkAssign.isPending
              ? <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  กำลังบันทึก
                </span>
              : `มอบหมาย ${trips.length} เที่ยว`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Trip card (row inside customer group) ─────────────────────

function TripCard({ trip, onAssign, isManager, selectMode, selected, onToggleSelect }: {
  trip: Trip;
  onAssign: (t: Trip) => void;
  isManager: boolean;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (t: Trip) => void;
}) {
  const canAssign = isManager && (trip.status === 'unassigned' || trip.status === 'assigned');
  const isCancelled = trip.status === 'cancelled';
  const selecting = !!selectMode && canAssign;

  return (
    <div className={cn(
      'flex items-start gap-3 py-3 border-b last:border-b-0 border-gray-50',
      isCancelled && 'opacity-60',
      selecting && 'cursor-pointer',
      selecting && selected && 'bg-blue-50/60 -mx-4 px-4 rounded-lg'
    )}
    onClick={selecting ? () => onToggleSelect?.(trip) : undefined}>
      {/* Selection checkbox */}
      {selecting && (
        <button onClick={e => { e.stopPropagation(); onToggleSelect?.(trip); }} className="shrink-0 mt-0.5">
          {selected
            ? <CheckSquare className="h-5 w-5 text-blue-600" />
            : <Square className="h-5 w-5 text-gray-300" />}
        </button>
      )}
      {/* Trip number bubble */}
      <div className="flex flex-col items-center gap-1 shrink-0 mt-0.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
          {trip.trip_number}
        </div>
        <div className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[trip.status])} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-semibold', STATUS_PILL[trip.status])}>
            {STATUS_LABEL[trip.status]}
          </span>
          <span className="text-[10px] text-gray-400">{fmtShort(trip.scheduled_date)}</span>
        </div>

        <p className={cn('text-sm font-semibold text-gray-800 mt-1 truncate', isCancelled && 'line-through text-gray-400')}>
          {trip.loading_place || '—'} <span className="text-gray-300 font-normal">→</span> {trip.destination || '—'}
        </p>

        {trip.cargo_notes && (
          <p className="text-[10px] text-gray-500 mt-0.5 truncate">{trip.cargo_notes}</p>
        )}

        {/* Driver + timestamps */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
          {trip.driver ? (
            <span className="flex items-center gap-1 text-[11px] text-gray-600 font-medium">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-[9px] font-bold text-blue-700">
                {trip.driver.name.charAt(0)}
              </span>
              {trip.driver.name}
            </span>
          ) : (
            <span className="text-[11px] text-gray-400 italic">ยังไม่มีพนักงาน</span>
          )}
          {trip.vehicle && (
            <span className="text-[10px] font-mono font-semibold text-gray-500 bg-gray-100 rounded-md px-1.5 py-0.5">
              🚛 {trip.vehicle.plate_number}
            </span>
          )}
          {trip.started_at && (
            <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
              ▶ {fmtTime(trip.started_at)}
            </span>
          )}
          {trip.completed_at && (
            <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
              ✓ {fmtTime(trip.completed_at)}
            </span>
          )}
        </div>

        {/* Booking ref */}
        {trip.booking?.booking_ref && (
          <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{trip.booking.booking_ref}</p>
        )}
      </div>

      {/* Action */}
      {!selectMode && canAssign && (
        <button onClick={() => onAssign(trip)}
          className={cn(
            'shrink-0 flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors',
            trip.status === 'unassigned'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
          )}>
          {trip.status === 'unassigned'
            ? <><UserCheck className="h-3 w-3" />มอบหมาย</>
            : <><RotateCcw className="h-3 w-3" />เปลี่ยน</>}
        </button>
      )}
    </div>
  );
}

// ── Customer group card ───────────────────────────────────────

function CustomerGroup({ customer, trips, isManager, onAssign, selectMode, selectedIds, onToggleSelect }: {
  customer: string;
  trips: Trip[];
  isManager: boolean;
  onAssign: (t: Trip) => void;
  selectMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (t: Trip) => void;
}) {
  const [open, setOpen] = useState(true);
  const unassigned = trips.filter(t => t.status === 'unassigned').length;
  const inProgress = trips.filter(t => t.status === 'in_progress').length;
  const completed  = trips.filter(t => t.status === 'completed').length;
  const assigned   = trips.filter(t => t.status === 'assigned').length;
  const cancelled  = trips.filter(t => t.status === 'cancelled').length;
  const activeCount = trips.length - cancelled; // cancelled trips don't count toward progress
  const allDone    = completed === activeCount && activeCount > 0;

  return (
    <div className={cn(
      'rounded-2xl border bg-white shadow-sm overflow-hidden',
      allDone ? 'border-emerald-100' : unassigned > 0 ? 'border-orange-100' : 'border-gray-100'
    )}>
      {/* Header */}
      <button onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 transition-colors text-left',
          allDone ? 'bg-emerald-50/60' : unassigned > 0 ? 'bg-orange-50/60' : 'bg-gray-50'
        )}>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm truncate">{customer}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[10px]">
            <span className="text-gray-500">{trips.length} เที่ยว</span>
            {unassigned > 0 && (
              <span className="flex items-center gap-0.5 font-semibold text-orange-600">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                รอ {unassigned}
              </span>
            )}
            {assigned > 0 && (
              <span className="flex items-center gap-0.5 font-semibold text-blue-600">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                มอบ {assigned}
              </span>
            )}
            {inProgress > 0 && (
              <span className="flex items-center gap-0.5 font-semibold text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                วิ่ง {inProgress}
              </span>
            )}
            {completed > 0 && (
              <span className="flex items-center gap-0.5 font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                เสร็จ {completed}
              </span>
            )}
            {cancelled > 0 && (
              <span className="flex items-center gap-0.5 font-semibold text-red-500">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                ยกเลิก {cancelled}
              </span>
            )}
          </div>
        </div>

        {/* Progress bar (cancelled trips excluded from the total) */}
        {activeCount > 0 && (
          <div className="w-16 shrink-0">
            <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${(completed / activeCount) * 100}%` }}
              />
            </div>
            <p className="text-[9px] text-gray-400 text-right mt-0.5">{completed}/{activeCount}</p>
          </div>
        )}

        {open ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
      </button>

      {/* Trip list */}
      {open && (
        <div className="px-4">
          {trips.map(t => (
            <TripCard key={t.id} trip={t} onAssign={onAssign} isManager={isManager}
              selectMode={selectMode} selected={selectedIds?.has(t.id)} onToggleSelect={onToggleSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Date group section ────────────────────────────────────────

function DateSection({ date, trips, isManager, onAssign, selectMode, selectedIds, onToggleSelect }: {
  date: string;
  trips: Trip[];
  isManager: boolean;
  onAssign: (t: Trip) => void;
  selectMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (t: Trip) => void;
}) {
  const today    = todayStr();
  const tomorrow = tomorrowStr();
  const label = date === today ? 'วันนี้' : date === tomorrow ? 'พรุ่งนี้' : fmtShort(date);

  // Group by customer within this date
  const customerMap = new Map<string, Trip[]>();
  for (const t of trips) {
    const key = t.customer ?? 'ไม่ระบุลูกค้า';
    if (!customerMap.has(key)) customerMap.set(key, []);
    customerMap.get(key)!.push(t);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className={cn(
          'rounded-xl px-3 py-1 text-xs font-bold',
          date === today ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
        )}>
          {label}
        </div>
        <div className="flex-1 h-px bg-gray-100" />
        <p className="text-[10px] text-gray-400">{trips.length} เที่ยว</p>
      </div>

      {Array.from(customerMap.entries()).map(([customer, ts]) => (
        <CustomerGroup
          key={customer}
          customer={customer}
          trips={ts}
          isManager={isManager}
          onAssign={onAssign}
          selectMode={selectMode}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

type DateMode = 'today' | 'tomorrow' | 'week' | 'custom';

export default function PlanningPage() {
  const { role } = useRole();
  const isManager = role === 'manager';

  const [assignTarget, setAssignTarget] = useState<Trip | null>(null);
  const [statusFilter, setStatusFilter] = useState<Trip['status'] | 'all'>('all');
  const [search, setSearch] = useState('');
  const [dateMode, setDateMode] = useState<DateMode>('today');
  const [customDate, setCustomDate] = useState(todayStr());
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const toggleSelect = (t: Trip) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(t.id)) next.delete(t.id); else next.add(t.id);
    return next;
  });
  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()); };

  const { data: trips = [], isLoading, refetch } = useAllTrips();
  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers-list'],
    queryFn: async () => {
      const { data } = await createClient()
        .from('drivers')
        .select('id, name, license_type, adr_certificate_expiry')
        .eq('active', true).order('name');
      return (data ?? []) as DriverOption[];
    },
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles-list'],
    queryFn: async () => {
      const { data } = await createClient()
        .from('vehicles')
        .select('id, plate_number, vehicle_type, powertrain, battery_soc, ownership')
        .eq('active', true).order('ownership').order('plate_number');
      return (data ?? []) as VehicleOption[];
    },
  });

  // ── Date constants (computed once per render) ─────────────
  const today    = todayStr();
  const tomorrow = tomorrowStr();

  const dateFiltered = trips.filter(t => {
    if (!t.scheduled_date) return false;
    if (dateMode === 'today')    return t.scheduled_date === today;
    if (dateMode === 'tomorrow') return t.scheduled_date === tomorrow;
    if (dateMode === 'custom')   return t.scheduled_date === customDate;
    return true; // 'week'
  });

  // ── Status + search filter ────────────────────────────────
  const filtered = dateFiltered.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (t.customer ?? '').toLowerCase().includes(q) ||
      (t.loading_place ?? '').toLowerCase().includes(q) ||
      (t.destination ?? '').toLowerCase().includes(q) ||
      (t.driver?.name ?? '').toLowerCase().includes(q) ||
      (t.booking?.booking_ref ?? '').toLowerCase().includes(q)
    );
  });

  // ── Group by date, then customer ──────────────────────────
  const dateMap = new Map<string, Trip[]>();
  for (const t of filtered) {
    const key = t.scheduled_date ?? 'ไม่ระบุวันที่';
    if (!dateMap.has(key)) dateMap.set(key, []);
    dateMap.get(key)!.push(t);
  }
  // Sort dates ascending
  const sortedDates = Array.from(dateMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  const selectedTrips = trips.filter(t => selectedIds.has(t.id));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-xl px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">การวางแผนงาน</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {isManager ? 'มอบหมายและติดตามเที่ยว' : 'ดูแผนงานทั้งหมด'}
            </p>
          </div>
          <button onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 shadow-sm">
            <RefreshCw className="h-3.5 w-3.5" />
            รีเฟรช
          </button>
        </div>

        {/* Stats */}
        <StatsBar trips={trips} />

        {/* Date mode selector */}
        <div className="flex gap-2">
          {([
            { mode: 'today',    label: 'วันนี้' },
            { mode: 'tomorrow', label: 'พรุ่งนี้' },
            { mode: 'week',     label: 'สัปดาห์นี้' },
            { mode: 'custom',   label: 'เลือกวัน' },
          ] as { mode: DateMode; label: string }[]).map(d => (
            <button key={d.mode} onClick={() => setDateMode(d.mode)}
              className={cn(
                'rounded-xl px-3 py-2 text-xs font-semibold transition-colors',
                dateMode === d.mode ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              )}>
              {d.label}
            </button>
          ))}
        </div>

        {/* Custom date picker */}
        {dateMode === 'custom' && (
          <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)}
            className="w-full rounded-xl border-2 border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:border-blue-500" />
        )}

        {/* Search */}
        <input type="text" placeholder="ค้นหาลูกค้า, เส้นทาง, พนักงาน, เลขจอง..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />

        {/* Status filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {(['all', 'unassigned', 'assigned', 'in_progress', 'completed', 'cancelled'] as const).map(s => {
            const count = s === 'all' ? filtered.length : filtered.filter(t => t.status === s).length;
            return (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors shrink-0',
                  statusFilter === s ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                )}>
                {s === 'all' ? 'ทั้งหมด' : STATUS_LABEL[s]}
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  statusFilter === s ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Multi-select toggle (manager only) */}
        {isManager && (
          <button onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
            className={cn(
              'flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors',
              selectMode ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            )}>
            <ListChecks className="h-3.5 w-3.5" />
            {selectMode ? 'ออกจากโหมดเลือกหลายงาน' : 'เลือกหลายงาน → มอบหมายพร้อมกัน'}
          </button>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />)}
          </div>
        ) : sortedDates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center space-y-2 shadow-sm">
            <Truck className="h-10 w-10 text-gray-200 mx-auto" />
            <p className="text-sm text-gray-400">ไม่พบงานในช่วงนี้</p>
            {search && (
              <button onClick={() => setSearch('')}
                className="text-xs text-blue-500 underline underline-offset-2">
                ล้างการค้นหา
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map(([date, ts]) => (
              <DateSection
                key={date}
                date={date}
                trips={ts}
                isManager={isManager}
                onAssign={setAssignTarget}
                selectMode={selectMode}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
              />
            ))}
          </div>
        )}

      </div>

      {/* Bulk-select floating bar */}
      {selectMode && selectedIds.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <button onClick={() => setSelectedIds(new Set())}
              className="text-xs font-semibold text-gray-500 underline underline-offset-2">ล้าง</button>
            <p className="text-sm font-bold text-gray-800">เลือกแล้ว {selectedIds.size} เที่ยว</p>
            <button onClick={() => setBulkOpen(true)}
              className="ml-auto flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">
              <UserCheck className="h-4 w-4" /> มอบหมายให้คนเดียว
            </button>
          </div>
        </div>
      )}

      {/* Assign modal */}
      {assignTarget && (
        <AssignModal
          trip={assignTarget}
          drivers={drivers}
          vehicles={vehicles}
          onClose={() => setAssignTarget(null)}
        />
      )}

      {/* Bulk assign modal */}
      {bulkOpen && selectedTrips.length > 0 && (
        <BulkAssignModal
          trips={selectedTrips}
          drivers={drivers}
          vehicles={vehicles}
          onClose={() => { setBulkOpen(false); exitSelectMode(); }}
        />
      )}
    </div>
  );
}
