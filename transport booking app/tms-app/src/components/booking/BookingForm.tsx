

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronRight, Lightbulb, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';
import { useCreateBooking } from '@/hooks/useBookings';
import { createClient } from '@/lib/supabase/client';
import {
  SITES, CUSTOMERS, TRUCK_TYPES, ACTIVITIES,
  LOADING_PLACES, DELIVERY_PLACES, SHIFTS, CSR_CONTACTS, COMMON_ROUTES,
  routeCategoryFromTruckType,
} from '@/lib/reference-data';
import type { CreateBookingForm, RouteCategory } from '@/types';
import { cn } from '@/lib/utils';

// --- Types for this form ---
type ShiftPlan = {
  time_from: string;
  time_to: string;
  total_trips: string;
};

interface ExtendedBookingForm extends CreateBookingForm {
  customer: string;
  loading_place_1: string;
  loading_place_2: string;
  loading_place_3: string;
  delivery_place_1: string;
  activity: string;
  truck_type_label: string;
  shift: 'DAY' | 'NIGHT' | 'BOTH';
  day_plan: ShiftPlan;
  night_plan: ShiftPlan;
  csr_contact: string;
  order_remark: string;
  reserve_date: string;
}

const EMPTY_SHIFT: ShiftPlan = { time_from: '', time_to: '', total_trips: '' };

const IS_HAZMAT_CUSTOMER = new Set([
  'BMSCPD', 'BMSCPDRM', 'STYROLUTION', 'SOLVAY', 'SOLVAYTHAI',
]);
const IS_BPA_CUSTOMER = new Set(['BMSCPD', 'BMSCPDRM']);

export function BookingForm() {
  const createBooking = useCreateBooking();
  const [form, setForm] = useState<ExtendedBookingForm>({
    requested_date: new Date().toISOString().split('T')[0],
    reserve_date: new Date().toISOString().split('T')[0],
    site_id: '',
    vehicle_type: 'Shuttle',
    cargo_type: 'General',
    is_bpa_cargo: false,
    customer: '',
    loading_place_1: '',
    loading_place_2: '',
    loading_place_3: '',
    delivery_place_1: '',
    activity: 'Transfer',
    truck_type_label: '',
    shift: 'DAY',
    day_plan: EMPTY_SHIFT,
    night_plan: EMPTY_SHIFT,
    csr_contact: '',
    order_remark: '',
    notes: '',
  });

  const [suggestedRoutes, setSuggestedRoutes] = useState<typeof COMMON_ROUTES>([]);

  // Load sites for site_id resolution
  const { data: sitesDb = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from('sites').select('id, site_name').order('site_name');
      return data ?? [];
    },
  });

  // Auto-suggest routes when customer changes
  useEffect(() => {
    if (form.customer) {
      const suggestions = COMMON_ROUTES.filter(r => r.customer === form.customer);
      setSuggestedRoutes(suggestions);
    } else {
      setSuggestedRoutes([]);
    }
  }, [form.customer]);

  // Auto-fill BPA/hazmat flags when customer or truck type changes
  useEffect(() => {
    const isBpa = IS_BPA_CUSTOMER.has(form.customer);
    const isHazmat = IS_HAZMAT_CUSTOMER.has(form.customer);
    const truck = TRUCK_TYPES.find(t => t.value === form.truck_type_label);
    setForm(prev => ({
      ...prev,
      is_bpa_cargo: isBpa,
      cargo_type: isBpa ? 'BPA' : isHazmat ? 'Chemical' : 'General',
      vehicle_type: truck?.category ?? prev.vehicle_type,
    }));
  }, [form.customer, form.truck_type_label]);

  function set<K extends keyof ExtendedBookingForm>(key: K, val: ExtendedBookingForm[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  function applyRoute(route: typeof COMMON_ROUTES[number]) {
    const truck = TRUCK_TYPES.find(t => t.value === route.truck_type);
    setForm(prev => ({
      ...prev,
      loading_place_1: route.loading,
      delivery_place_1: route.delivery,
      truck_type_label: route.truck_type,
      vehicle_type: truck?.category ?? prev.vehicle_type,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const siteRow = sitesDb.find(s => s.site_name === form.loading_place_1 || s.site_name === form.site_id);
    const totalTrips =
      (parseInt(form.day_plan.total_trips || '0') || 0) +
      (parseInt(form.night_plan.total_trips || '0') || 0);

    await createBooking.mutateAsync({
      requested_date: form.requested_date,
      site_id: siteRow?.id ?? sitesDb[0]?.id ?? '',
      vehicle_type: form.vehicle_type,
      cargo_type: form.cargo_type,
      is_bpa_cargo: form.is_bpa_cargo,
      quantity: totalTrips || undefined,
      unit: 'trips',
      notes: [form.order_remark, form.notes].filter(Boolean).join(' | ') || undefined,
      route_category: routeCategoryFromTruckType(form.truck_type_label) as RouteCategory,
      origin_site_id: sitesDb.find(s => s.site_name === form.loading_place_1)?.id,
      dest_site_id: sitesDb.find(s => s.site_name === form.delivery_place_1)?.id,
    });

    // Reset form
    setForm({
      requested_date: new Date().toISOString().split('T')[0],
      reserve_date: new Date().toISOString().split('T')[0],
      site_id: '', vehicle_type: 'Shuttle', cargo_type: 'General', is_bpa_cargo: false,
      customer: '', loading_place_1: '', loading_place_2: '', loading_place_3: '',
      delivery_place_1: '', activity: 'Transfer', truck_type_label: '', shift: 'DAY',
      day_plan: EMPTY_SHIFT, night_plan: EMPTY_SHIFT, csr_contact: '', order_remark: '', notes: '',
    });
  }

  const isBpa = IS_BPA_CUSTOMER.has(form.customer);
  const isHazmat = IS_HAZMAT_CUSTOMER.has(form.customer);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Alert banners ────────────────────────────────── */}
      {isBpa && (
        <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold text-red-800">BPA Cargo — ท.4 + ADR Required</p>
            <p className="text-sm text-red-700 mt-0.5">
              {form.customer} is a BPA-designated customer. Dispatch will hard-block assignment unless driver holds ท.4 license with valid ADR certificate.
            </p>
          </div>
        </div>
      )}
      {!isBpa && isHazmat && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            <strong>{form.customer}</strong> is a chemical/hazardous customer. ADR certificate required.
          </p>
        </div>
      )}

      {/* ── Section 1: Date & Identification ─────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">1 — Request Details</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Request Date</label>
            <input type="date" required value={form.requested_date}
              onChange={e => set('requested_date', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Run Date (Reserve)</label>
            <input type="date" value={form.reserve_date}
              onChange={e => set('reserve_date', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">CSR / Phone No.</label>
            <select value={form.csr_contact} onChange={e => set('csr_contact', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Select CSR...</option>
              {CSR_CONTACTS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Shift</label>
            <div className="flex gap-1.5">
              {(['DAY','NIGHT','BOTH'] as const).map(s => (
                <button key={s} type="button" onClick={() => set('shift', s)}
                  className={cn('flex-1 rounded-lg border py-2 text-xs font-semibold transition-colors',
                    form.shift === s
                      ? s === 'DAY' ? 'border-amber-400 bg-amber-50 text-amber-700'
                        : s === 'NIGHT' ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                        : 'border-purple-400 bg-purple-50 text-purple-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50')}>
                  {s === 'DAY' ? '☀️ Day' : s === 'NIGHT' ? '🌙 Night' : '↔ Both'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: Site & Customer ────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">2 — Site & Customer</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Site (KNS Origin)</label>
            <select value={form.site_id} onChange={e => set('site_id', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Select site...</option>
              {SITES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Customer</label>
            <div className="flex gap-2 items-center">
              <select value={form.customer} onChange={e => set('customer', e.target.value)} required
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Select customer...</option>
                {CUSTOMERS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {isBpa && <Badge variant="danger">BPA</Badge>}
              {!isBpa && isHazmat && <Badge variant="warning">Hazmat</Badge>}
            </div>
          </div>
        </div>

        {/* Order Remark */}
        <div className="mt-3 space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Order Remark</label>
          <input type="text" value={form.order_remark} onChange={e => set('order_remark', e.target.value)}
            placeholder="e.g. เที่ยวสุดท้ายก่อน 23:00, ต้องถึงก่อน 9:00"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
      </div>

      {/* ── Section 3: Route ──────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">3 — Route</h3>

        {/* Suggested routes */}
        {suggestedRoutes.length > 0 && (
          <div className="mb-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-amber-700">
              <Lightbulb className="h-3.5 w-3.5" />
              <span>Common routes for <strong>{form.customer}</strong> — click to auto-fill:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedRoutes.map((r, i) => (
                <button key={i} type="button" onClick={() => applyRoute(r)}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-100 transition-colors">
                  <span>{r.loading}</span>
                  <ChevronRight className="h-3 w-3" />
                  <span>{r.delivery}</span>
                  <span className="text-amber-500 ml-1">({r.truck_type.split('(')[0].trim()})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          {/* Loading places */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-medium text-gray-600">Loading Place 1 <span className="text-red-500">*</span></label>
            <select required value={form.loading_place_1} onChange={e => set('loading_place_1', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Select...</option>
              {LOADING_PLACES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Loading Place 2</label>
            <select value={form.loading_place_2} onChange={e => set('loading_place_2', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">—</option>
              {LOADING_PLACES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="hidden md:flex items-center justify-center text-gray-400">
            <ChevronRight className="h-5 w-5" />
          </div>
          {/* Delivery place */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Delivery Place 1 <span className="text-red-500">*</span></label>
            <select required value={form.delivery_place_1} onChange={e => set('delivery_place_1', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Select...</option>
              {DELIVERY_PLACES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Activity</label>
            <select value={form.activity} onChange={e => set('activity', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              {ACTIVITIES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-medium text-gray-600">Truck Type</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TRUCK_TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => set('truck_type_label', t.value)}
                  className={cn('rounded-lg border px-2 py-2 text-left text-xs font-medium transition-colors',
                    form.truck_type_label === t.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50')}>
                  <span className="block font-semibold">{t.label.split('(')[0].trim()}</span>
                  {t.label.includes('(') && <span className="block text-gray-400 truncate">({t.label.split('(')[1]}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 4: Shift Trip Plans ──────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">4 — Trip Plan</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Day shift */}
          {(form.shift === 'DAY' || form.shift === 'BOTH') && (
            <Card className="p-4 border-amber-200 bg-amber-50/40">
              <p className="mb-3 text-xs font-semibold text-amber-700">☀️ Day Shift (07:00 – 19:00)</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Time From</label>
                  <input type="time" value={form.day_plan.time_from}
                    onChange={e => set('day_plan', {...form.day_plan, time_from: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Time To</label>
                  <input type="time" value={form.day_plan.time_to}
                    onChange={e => set('day_plan', {...form.day_plan, time_to: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Trips</label>
                  <input type="number" min={1} placeholder="0" value={form.day_plan.total_trips}
                    onChange={e => set('day_plan', {...form.day_plan, total_trips: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                </div>
              </div>
            </Card>
          )}
          {/* Night shift */}
          {(form.shift === 'NIGHT' || form.shift === 'BOTH') && (
            <Card className="p-4 border-indigo-200 bg-indigo-50/40">
              <p className="mb-3 text-xs font-semibold text-indigo-700">🌙 Night Shift (19:00 – 07:00)</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Time From</label>
                  <input type="time" value={form.night_plan.time_from}
                    onChange={e => set('night_plan', {...form.night_plan, time_from: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Time To</label>
                  <input type="time" value={form.night_plan.time_to}
                    onChange={e => set('night_plan', {...form.night_plan, time_to: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Trips</label>
                  <input type="number" min={1} placeholder="0" value={form.night_plan.total_trips}
                    onChange={e => set('night_plan', {...form.night_plan, total_trips: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Trip total preview */}
        {((form.day_plan.total_trips || form.night_plan.total_trips)) && (
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4 text-gray-400" />
            Total planned trips:{' '}
            <strong>
              {(parseInt(form.day_plan.total_trips || '0') || 0) +
               (parseInt(form.night_plan.total_trips || '0') || 0)}
            </strong>
          </div>
        )}
      </div>

      {/* ── Section 5: Summary card ───────────────────────── */}
      {form.customer && form.loading_place_1 && form.delivery_place_1 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm">
          <p className="font-semibold text-blue-800 mb-2">Booking Summary</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-blue-700 text-xs">
            <span>Customer: <strong>{form.customer}</strong></span>
            <span>Truck: <strong>{form.truck_type_label || '—'}</strong></span>
            <span>Route: <strong>{form.loading_place_1} → {form.delivery_place_1}</strong></span>
            <span>Activity: <strong>{form.activity}</strong></span>
            <span>Shift: <strong>{form.shift}</strong></span>
            <span>Total Trips: <strong>
              {(parseInt(form.day_plan.total_trips || '0') || 0) +
               (parseInt(form.night_plan.total_trips || '0') || 0) || '—'}
            </strong></span>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
        <Button variant="outline" type="button" onClick={() => setForm(f => ({...f, customer: '', loading_place_1: '', delivery_place_1: '', day_plan: EMPTY_SHIFT, night_plan: EMPTY_SHIFT}))}>
          <RefreshCw className="h-4 w-4" /> Clear Route
        </Button>
        <Button type="submit" loading={createBooking.isPending}
          disabled={!form.customer || !form.loading_place_1 || !form.delivery_place_1}>
          Submit Booking Request
        </Button>
      </div>
    </form>
  );
}
