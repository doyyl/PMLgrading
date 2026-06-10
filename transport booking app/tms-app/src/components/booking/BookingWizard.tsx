import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDays, ArrowRight, ArrowLeft, CheckCircle2,
  Sun, Moon, AlertTriangle, Lightbulb, ChevronRight, Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useCreateBooking } from '@/hooks/useBookings';
import { createClient } from '@/lib/supabase/client';
import {
  SITES, CUSTOMERS, TRUCK_TYPES, ACTIVITIES,
  LOADING_PLACES, DELIVERY_PLACES, CSR_CONTACTS, COMMON_ROUTES,
  routeCategoryFromTruckType,
} from '@/lib/reference-data';
import type { RouteCategory } from '@/types';
import { cn } from '@/lib/utils';

// ─── State ───────────────────────────────────────────────────
interface WizardState {
  // Step 1
  requested_date: string;
  reserve_date: string;
  shift: 'DAY' | 'NIGHT' | 'BOTH';
  csr_contact: string;
  // Step 2
  site: string;
  customer: string;
  loading_place: string;
  delivery_place: string;
  is_round_trip: boolean;
  order_remark: string;
  // Step 3
  truck_type: string;
  activity: string;
  day_trips: string;
  night_trips: string;
  day_time_from: string;
  day_time_to: string;
  night_time_from: string;
  night_time_to: string;
}

const BPA_CUSTOMERS = new Set(['BMSCPD', 'BMSCPDRM']);
const HAZMAT_CUSTOMERS = new Set(['BMSCPD', 'BMSCPDRM', 'STYROLUTION', 'SOLVAY', 'SOLVAYTHAI']);

const today = new Date().toISOString().split('T')[0];

const INIT: WizardState = {
  requested_date: today, reserve_date: today, shift: 'DAY', csr_contact: '',
  site: '', customer: '', loading_place: '', delivery_place: '', is_round_trip: false, order_remark: '',
  truck_type: '', activity: 'Transfer',
  day_trips: '', night_trips: '',
  day_time_from: '07:00', day_time_to: '19:00',
  night_time_from: '19:00', night_time_to: '07:00',
};

// ─── Step indicator ───────────────────────────────────────────
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={cn(
          'rounded-full transition-all duration-200',
          i < current ? 'h-2 w-2 bg-blue-600' :
          i === current ? 'h-2 w-8 bg-blue-600' : 'h-2 w-2 bg-gray-200'
        )} />
      ))}
    </div>
  );
}

// ─── Reusable chip button ─────────────────────────────────────
function ChipButton({ label, sub, selected, onClick, color = 'blue', icon }: {
  label: string; sub?: string; selected: boolean; onClick: () => void;
  color?: 'blue' | 'amber' | 'indigo' | 'red'; icon?: React.ReactNode;
}) {
  const colors = {
    blue:   selected ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200'   : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50',
    amber:  selected ? 'border-amber-500 bg-amber-50 text-amber-700 ring-2 ring-amber-200' : 'border-gray-200 hover:border-amber-300',
    indigo: selected ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-indigo-300',
    red:    selected ? 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-200'       : 'border-gray-200 hover:border-red-300',
  };
  return (
    <button type="button" onClick={onClick}
      className={cn('flex flex-col items-center gap-1 rounded-xl border-2 px-4 py-3 text-center transition-all cursor-pointer',
        colors[color], !selected && 'text-gray-600')}>
      {icon}
      <span className="font-semibold text-sm leading-tight">{label}</span>
      {sub && <span className="text-xs opacity-70">{sub}</span>}
    </button>
  );
}

// ─── Main wizard ─────────────────────────────────────────────
export function BookingWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardState>(INIT);
  const [done, setDone] = useState(false);
  const createBooking = useCreateBooking();

  const { data: sitesDb = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from('sites').select('id, site_name');
      return data ?? [];
    },
  });

  const set = <K extends keyof WizardState>(k: K, v: WizardState[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  const isBpa    = BPA_CUSTOMERS.has(form.customer);
  const isHazmat = HAZMAT_CUSTOMERS.has(form.customer);
  const suggestions = COMMON_ROUTES.filter(r => r.customer === form.customer);

  const totalTrips =
    (parseInt(form.day_trips   || '0') || 0) +
    (parseInt(form.night_trips || '0') || 0);

  async function submit() {
    const originSite = sitesDb.find(s => s.site_name === form.loading_place);
    const destSite   = sitesDb.find(s => s.site_name === form.delivery_place);
    // site_id = destination first, then origin, then first available
    const siteRow = destSite ?? originSite ?? sitesDb[0];

    const notesParts = [
      form.is_round_trip ? '[ไปกลับ]' : '[เที่ยวเดียว]',
      form.order_remark || '',
    ].filter(Boolean);

    await createBooking.mutateAsync({
      requested_date: form.reserve_date,   // ← fixed: was form.requested_date
      site_id: siteRow?.id ?? '',
      vehicle_type: TRUCK_TYPES.find(t => t.value === form.truck_type)?.category ?? 'Shuttle',
      cargo_type: isBpa ? 'BPA' : isHazmat ? 'Chemical' : 'General',
      is_bpa_cargo: isBpa,
      quantity: totalTrips || undefined,
      unit: 'trips',
      notes: notesParts.join(' ') || undefined,
      route_category: routeCategoryFromTruckType(form.truck_type) as RouteCategory,
      origin_site_id: originSite?.id,
      dest_site_id:   destSite?.id,
    });
    setDone(true);
  }

  // ── Success screen ──
  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-9 w-9 text-green-600" />
        </div>
        <p className="text-xl font-bold text-gray-900">จองรถสำเร็จ!</p>
        <p className="text-sm text-gray-500">
          {form.customer} · {form.is_round_trip
            ? `${form.loading_place} ⇄ ${form.delivery_place}`
            : `${form.loading_place} → ${form.delivery_place}`}<br />
          {form.reserve_date} · {totalTrips} เที่ยว {form.is_round_trip && '· ไปกลับ'}
        </p>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={() => { setForm(INIT); setDone(false); setStep(0); }}>
            จองรถใหม่
          </Button>
          <Button onClick={() => { window.location.href = '/planning'; }}>
            ดูแผนงาน →
          </Button>
        </div>
      </div>
    );
  }

  const STEPS = ['วันที่ & กะ', 'เส้นทาง', 'ประเภทรถ', 'ยืนยัน'];

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Step label */}
      <div className="mb-2 flex items-center justify-between text-xs text-gray-400 px-1">
        <span>ขั้นตอนที่ {step + 1} จาก {STEPS.length}</span>
        <span className="font-semibold text-blue-600">{STEPS[step]}</span>
      </div>
      <StepDots current={step} total={STEPS.length} />

      {/* ═══════════════════════════════════════════════════ */}
      {/* STEP 0 — วันที่ & กะ                               */}
      {/* ═══════════════════════════════════════════════════ */}
      {step === 0 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="text-center space-y-1">
            <p className="text-2xl font-bold text-gray-900">📅 วันที่ต้องการรถ</p>
            <p className="text-sm text-gray-500">เลือกวันที่วิ่งงานและกะ</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">วันที่วิ่งงาน</label>
              <input type="date" value={form.reserve_date}
                onChange={e => set('reserve_date', e.target.value)}
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-lg font-semibold text-gray-900 focus:border-blue-500 focus:outline-none" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">กะงาน</label>
              <div className="grid grid-cols-3 gap-3">
                <ChipButton label="กลางวัน" sub="07:00–19:00" selected={form.shift==='DAY'}
                  onClick={()=>set('shift','DAY')} color="amber"
                  icon={<Sun className="h-6 w-6 text-amber-500"/>} />
                <ChipButton label="กลางคืน" sub="19:00–07:00" selected={form.shift==='NIGHT'}
                  onClick={()=>set('shift','NIGHT')} color="indigo"
                  icon={<Moon className="h-6 w-6 text-indigo-500"/>} />
                <ChipButton label="ทั้งสองกะ" sub="ทั้งวัน" selected={form.shift==='BOTH'}
                  onClick={()=>set('shift','BOTH')} color="blue"
                  icon={<span className="text-xl">↔️</span>} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">CSR / ผู้ติดต่อ</label>
              <select value={form.csr_contact} onChange={e => set('csr_contact', e.target.value)}
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none">
                <option value="">— เลือกผู้ติดต่อ (ถ้ามี) —</option>
                {CSR_CONTACTS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <Button className="w-full py-4 text-base" onClick={() => setStep(1)}
            disabled={!form.reserve_date}>
            ถัดไป: เลือกเส้นทาง <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* STEP 1 — เส้นทาง                                   */}
      {/* ═══════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="text-center space-y-1">
            <p className="text-2xl font-bold text-gray-900">🗺️ เส้นทาง</p>
            <p className="text-sm text-gray-500">เลือกลูกค้า จุดรับ และจุดส่ง</p>
          </div>

          {/* Customer picker — big grid */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">ลูกค้า <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-3 gap-2">
              {CUSTOMERS.map(c => (
                <button key={c} type="button" onClick={() => set('customer', c)}
                  className={cn(
                    'rounded-xl border-2 py-3 px-2 text-sm font-semibold transition-all text-center',
                    form.customer === c
                      ? isBpa ? 'border-red-500 bg-red-50 text-red-700'
                              : isHazmat ? 'border-amber-500 bg-amber-50 text-amber-700'
                              : 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50/40'
                  )}>
                  {c}
                  {BPA_CUSTOMERS.has(c) && <span className="block text-[10px] text-red-500 font-normal mt-0.5">BPA</span>}
                </button>
              ))}
            </div>

            {/* Alert */}
            {isBpa && (
              <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                <span>BPA cargo — ต้องการพขร. ใบอนุญาต ท.4 + ใบ ADR ที่ยังไม่หมดอายุ</span>
              </div>
            )}
          </div>

          {/* Route quick-fill */}
          {suggestions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                <Lightbulb className="h-3.5 w-3.5" />
                เส้นทางที่ใช้บ่อย — กดเพื่อเติมอัตโนมัติ
              </div>
              {suggestions.map((r, i) => (
                <button key={i} type="button"
                  onClick={() => { set('loading_place', r.loading); set('delivery_place', r.delivery); set('truck_type', r.truck_type); }}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm transition-all text-left',
                    form.loading_place === r.loading && form.delivery_place === r.delivery
                      ? 'border-amber-400 bg-amber-50'
                      : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/40'
                  )}>
                  <Truck className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="font-semibold text-gray-800">{r.loading}</span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                  <span className="font-semibold text-gray-800">{r.delivery}</span>
                  <span className="ml-auto text-xs text-gray-400 shrink-0 max-w-[80px] text-right leading-tight">
                    {r.truck_type.split('(')[0].trim()}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Manual route */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600">จุดรับของ <span className="text-red-500">*</span></label>
                <select value={form.loading_place} onChange={e => set('loading_place', e.target.value)}
                  className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none">
                  <option value="">เลือก...</option>
                  {LOADING_PLACES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600">จุดส่งของ <span className="text-red-500">*</span></label>
                <select value={form.delivery_place} onChange={e => set('delivery_place', e.target.value)}
                  className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none">
                  <option value="">เลือก...</option>
                  {DELIVERY_PLACES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* Round-trip toggle */}
            <button
              type="button"
              onClick={() => set('is_round_trip', !form.is_round_trip)}
              className={cn(
                'flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 transition-all',
                form.is_round_trip
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{form.is_round_trip ? '🔄' : '➡️'}</span>
                <div className="text-left">
                  <p className={cn('text-sm font-semibold', form.is_round_trip ? 'text-blue-700' : 'text-gray-700')}>
                    {form.is_round_trip ? 'ไปกลับ (Round Trip)' : 'เที่ยวเดียว (One Way)'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {form.is_round_trip
                      ? `${form.loading_place || '?'} → ${form.delivery_place || '?'} → ${form.loading_place || '?'}`
                      : `${form.loading_place || '?'} → ${form.delivery_place || '?'}`}
                  </p>
                </div>
              </div>
              <div className={cn(
                'h-6 w-11 rounded-full transition-colors',
                form.is_round_trip ? 'bg-blue-500' : 'bg-gray-300'
              )}>
                <div className={cn(
                  'h-5 w-5 rounded-full bg-white shadow-sm transition-transform mt-0.5',
                  form.is_round_trip ? 'translate-x-5' : 'translate-x-0.5'
                )} />
              </div>
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600">หมายเหตุ / คำขอพิเศษ</label>
            <input type="text" value={form.order_remark} onChange={e => set('order_remark', e.target.value)}
              placeholder="เช่น เที่ยวสุดท้ายก่อน 23:00, ส่งถึงก่อน 9:00 น."
              className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(0)} className="px-5">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button className="flex-1 py-4 text-base"
              disabled={!form.customer || !form.loading_place || !form.delivery_place}
              onClick={() => setStep(2)}>
              ถัดไป: ประเภทรถ <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* STEP 2 — ประเภทรถ + จำนวนเที่ยว                   */}
      {/* ═══════════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="text-center space-y-1">
            <p className="text-2xl font-bold text-gray-900">🚛 ประเภทรถ & เที่ยว</p>
            <p className="text-sm text-gray-500">เลือกรถและกรอกจำนวนเที่ยวที่ต้องการ</p>
          </div>

          {/* Truck type cards */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">ประเภทรถ <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {TRUCK_TYPES.map(t => (
                <button key={t.value} type="button"
                  onClick={() => set('truck_type', t.value)}
                  className={cn(
                    'flex flex-col gap-1 rounded-xl border-2 p-4 text-left transition-all',
                    form.truck_type === t.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50/30'
                  )}>
                  <span className="text-lg">{
                    t.category === 'Bulk' ? '🏗️' : t.value.includes("40'") ? '📦' : '🚚'
                  }</span>
                  <span className="font-bold text-sm leading-tight">{t.label.split('(')[0].trim()}</span>
                  {t.label.includes('(') && (
                    <span className="text-xs opacity-60">({t.label.split('(')[1]}</span>
                  )}
                  <span className={cn('text-xs font-semibold mt-1',
                    t.category === 'Bulk' ? 'text-orange-500' :
                    t.category === 'Vanbox' ? 'text-teal-500' : 'text-blue-500')}>
                    {t.category}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Trip counts by shift */}
          <div className="rounded-2xl border-2 border-gray-100 bg-gray-50 p-4 space-y-4">
            <label className="text-sm font-semibold text-gray-700">จำนวนเที่ยว</label>

            {(form.shift === 'DAY' || form.shift === 'BOTH') && (
              <div className="flex items-center gap-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                <Sun className="h-5 w-5 text-amber-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-amber-700 mb-1">กะกลางวัน (07:00–19:00)</p>
                  <div className="flex items-center gap-2">
                    <input type="time" value={form.day_time_from} onChange={e=>set('day_time_from',e.target.value)}
                      className="w-24 rounded-lg border border-amber-300 bg-white px-2 py-1 text-xs" />
                    <span className="text-xs text-gray-400">–</span>
                    <input type="time" value={form.day_time_to} onChange={e=>set('day_time_to',e.target.value)}
                      className="w-24 rounded-lg border border-amber-300 bg-white px-2 py-1 text-xs" />
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <p className="text-xs text-amber-700 font-medium">เที่ยว</p>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={()=>set('day_trips', String(Math.max(0,(parseInt(form.day_trips)||0)-1)))}
                      className="h-8 w-8 rounded-lg bg-amber-200 text-amber-800 font-bold text-lg flex items-center justify-center hover:bg-amber-300">−</button>
                    <input type="number" min={0} value={form.day_trips} onChange={e=>set('day_trips',e.target.value)}
                      className="w-12 rounded-lg border border-amber-300 bg-white px-1 py-1 text-center font-bold text-base" />
                    <button type="button" onClick={()=>set('day_trips', String((parseInt(form.day_trips)||0)+1))}
                      className="h-8 w-8 rounded-lg bg-amber-200 text-amber-800 font-bold text-lg flex items-center justify-center hover:bg-amber-300">+</button>
                  </div>
                </div>
              </div>
            )}

            {(form.shift === 'NIGHT' || form.shift === 'BOTH') && (
              <div className="flex items-center gap-4 rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3">
                <Moon className="h-5 w-5 text-indigo-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-indigo-700 mb-1">กะกลางคืน (19:00–07:00)</p>
                  <div className="flex items-center gap-2">
                    <input type="time" value={form.night_time_from} onChange={e=>set('night_time_from',e.target.value)}
                      className="w-24 rounded-lg border border-indigo-300 bg-white px-2 py-1 text-xs" />
                    <span className="text-xs text-gray-400">–</span>
                    <input type="time" value={form.night_time_to} onChange={e=>set('night_time_to',e.target.value)}
                      className="w-24 rounded-lg border border-indigo-300 bg-white px-2 py-1 text-xs" />
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <p className="text-xs text-indigo-700 font-medium">เที่ยว</p>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={()=>set('night_trips', String(Math.max(0,(parseInt(form.night_trips)||0)-1)))}
                      className="h-8 w-8 rounded-lg bg-indigo-200 text-indigo-800 font-bold text-lg flex items-center justify-center hover:bg-indigo-300">−</button>
                    <input type="number" min={0} value={form.night_trips} onChange={e=>set('night_trips',e.target.value)}
                      className="w-12 rounded-lg border border-indigo-300 bg-white px-1 py-1 text-center font-bold text-base" />
                    <button type="button" onClick={()=>set('night_trips', String((parseInt(form.night_trips)||0)+1))}
                      className="h-8 w-8 rounded-lg bg-indigo-200 text-indigo-800 font-bold text-lg flex items-center justify-center hover:bg-indigo-300">+</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)} className="px-5">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button className="flex-1 py-4 text-base" disabled={!form.truck_type} onClick={() => setStep(3)}>
              ตรวจสอบ & ยืนยัน <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* STEP 3 — ยืนยัน                                     */}
      {/* ═══════════════════════════════════════════════════ */}
      {step === 3 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="text-center space-y-1">
            <p className="text-2xl font-bold text-gray-900">✅ ยืนยันการจอง</p>
            <p className="text-sm text-gray-500">ตรวจสอบข้อมูลก่อนส่ง</p>
          </div>

          {/* Summary card */}
          <div className="rounded-2xl border-2 border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">สรุปข้อมูลการจอง</p>
            </div>
            <div className="divide-y divide-gray-100">
              {[
                { label: '📅 วันที่วิ่งงาน', value: form.reserve_date },
                { label: '⏰ กะ', value: form.shift === 'DAY' ? '☀️ กลางวัน' : form.shift === 'NIGHT' ? '🌙 กลางคืน' : '↔️ ทั้งสองกะ' },
                { label: '🏢 ลูกค้า', value: form.customer, badge: isBpa ? 'BPA' : isHazmat ? 'Hazmat' : undefined },
                { label: '📍 เส้นทาง', value: form.is_round_trip
                    ? `${form.loading_place} → ${form.delivery_place} → ${form.loading_place}`
                    : `${form.loading_place} → ${form.delivery_place}` },
                { label: '🔄 ประเภทเที่ยว', value: form.is_round_trip ? '🔄 ไปกลับ' : '➡️ เที่ยวเดียว' },
                { label: '🚛 ประเภทรถ', value: form.truck_type || '—' },
                { label: '🔢 จำนวนเที่ยวรวม', value: `${totalTrips} เที่ยว`, highlight: true },
                ...(form.order_remark ? [{ label: '📝 หมายเหตุ', value: form.order_remark }] : []),
                ...(form.csr_contact ? [{ label: '📞 CSR', value: form.csr_contact }] : []),
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-gray-500">{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-sm font-semibold text-right', (row as any).highlight && 'text-blue-600 text-base')}>
                      {row.value}
                    </span>
                    {(row as any).badge && (
                      <Badge variant={(row as any).badge === 'BPA' ? 'danger' : 'warning'}>
                        {(row as any).badge}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isBpa && (
            <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>BPA cargo — ระบบจะบล็อกการมอบหมายพขร. ที่ไม่มีใบ ท.4 + ADR โดยอัตโนมัติ</span>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)} className="px-5">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button className="flex-1 py-4 text-base bg-green-600 hover:bg-green-700"
              loading={createBooking.isPending} onClick={submit}>
              ✅ ยืนยันส่งการจอง
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
