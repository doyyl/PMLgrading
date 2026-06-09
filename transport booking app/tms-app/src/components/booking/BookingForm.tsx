'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Package, Truck, CalendarDays, MapPin, Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useCreateBooking } from '@/hooks/useBookings';
import { createClient } from '@/lib/supabase/client';
import type { CreateBookingForm, VehicleType, CargoType, RouteCategory, Site } from '@/types';
import { cn } from '@/lib/utils';

const VEHICLE_TYPES: VehicleType[] = ['Shuttle', 'Bulk', 'Vanbox'];
const CARGO_TYPES: { value: CargoType; label: string; hazmat: boolean }[] = [
  { value: 'General', label: 'General Cargo', hazmat: false },
  { value: 'Chemical', label: 'Chemical', hazmat: true },
  { value: 'Hazardous', label: 'Hazardous Material', hazmat: true },
  { value: 'BPA', label: 'BPA (Bisphenol A)', hazmat: true },
  { value: 'ISO_Tank', label: 'ISO Tank', hazmat: true },
];
const ROUTE_CATEGORIES: { value: RouteCategory; label: string }[] = [
  { value: 'Subcontract', label: 'Sub-contract' },
  { value: 'BSM_STYROLUTION', label: 'BSM & STYROLUTION' },
  { value: 'Shuttle', label: 'Shuttle' },
  { value: 'Bulk', label: 'Bulk' },
  { value: 'Vanbox', label: 'Vanbox' },
];

export function BookingForm() {
  const createBooking = useCreateBooking();

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from('sites').select('*').order('site_name');
      return (data ?? []) as Site[];
    },
  });

  const [form, setForm] = useState<CreateBookingForm>({
    requested_date: new Date().toISOString().split('T')[0],
    site_id: '',
    vehicle_type: 'Shuttle',
    cargo_type: 'General',
    is_bpa_cargo: false,
    quantity: undefined,
    unit: 'MT',
    notes: '',
    route_category: undefined,
  });

  const selectedCargo = CARGO_TYPES.find((c) => c.value === form.cargo_type);
  const isHazmat = selectedCargo?.hazmat ?? false;
  const selectedSite = sites.find((s) => s.id === form.site_id);

  function handleChange<K extends keyof CreateBookingForm>(key: K, value: CreateBookingForm[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Auto-set is_bpa_cargo when BPA cargo selected
      if (key === 'cargo_type') {
        const cargo = CARGO_TYPES.find((c) => c.value === value);
        next.is_bpa_cargo = value === 'BPA' ? true : cargo?.hazmat ? prev.is_bpa_cargo : false;
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.site_id) return;
    await createBooking.mutateAsync(form);
    setForm({
      requested_date: new Date().toISOString().split('T')[0],
      site_id: '',
      vehicle_type: 'Shuttle',
      cargo_type: 'General',
      is_bpa_cargo: false,
      quantity: undefined,
      unit: 'MT',
      notes: '',
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* HazMat Alert Banner */}
      {isHazmat && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800">Hazardous Material Selected</p>
            <p className="text-sm text-amber-700 mt-0.5">
              This cargo type requires a driver with a <strong>ท.4 license</strong> and a{' '}
              <strong>valid ADR certificate</strong>. The system will enforce this during planning.
            </p>
          </div>
        </div>
      )}

      {/* BPA Site warning */}
      {selectedSite?.is_bpa_site && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm text-red-700">
            This is a <strong>BPA-designated site</strong>. All cargo assigned here must comply with BPA handling regulations.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Requested Date */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <CalendarDays className="h-4 w-4 text-gray-400" />
            Transport Date
          </label>
          <input
            type="date"
            required
            value={form.requested_date}
            onChange={(e) => handleChange('requested_date', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Site */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <MapPin className="h-4 w-4 text-gray-400" />
            Destination Site
          </label>
          <select
            required
            value={form.site_id}
            onChange={(e) => handleChange('site_id', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select a site...</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.site_name} {s.is_bpa_site ? '🔴 BPA' : ''} — {s.country}
              </option>
            ))}
          </select>
        </div>

        {/* Vehicle Type */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <Truck className="h-4 w-4 text-gray-400" />
            Vehicle Type
          </label>
          <div className="flex gap-2">
            {VEHICLE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleChange('vehicle_type', t)}
                className={cn(
                  'flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
                  form.vehicle_type === t
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Cargo Type */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <Package className="h-4 w-4 text-gray-400" />
            Cargo Type
          </label>
          <select
            value={form.cargo_type}
            onChange={(e) => handleChange('cargo_type', e.target.value as CargoType)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {CARGO_TYPES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.hazmat ? '⚠️ ' : ''}{c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Route Category */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Route Category</label>
          <select
            value={form.route_category ?? ''}
            onChange={(e) => handleChange('route_category', e.target.value as RouteCategory || undefined)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Auto-assign</option>
            {ROUTE_CATEGORIES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {/* Quantity */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Quantity</label>
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="e.g. 20"
              value={form.quantity ?? ''}
              onChange={(e) => handleChange('quantity', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <select
              value={form.unit}
              onChange={(e) => handleChange('unit', e.target.value)}
              className="w-24 rounded-lg border border-gray-300 px-2 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option>MT</option>
              <option>L</option>
              <option>Units</option>
              <option>TEU</option>
            </select>
          </div>
        </div>
      </div>

      {/* BPA Cargo Flag */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="is_bpa_cargo"
          checked={form.is_bpa_cargo}
          onChange={(e) => handleChange('is_bpa_cargo', e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="is_bpa_cargo" className="text-sm font-medium text-gray-700">
          Mark as BPA Cargo
          <span className="ml-2 text-xs text-gray-500">(Requires ท.4 license + valid ADR cert)</span>
        </label>
        {form.is_bpa_cargo && <Badge variant="danger">BPA</Badge>}
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">Special Instructions</label>
        <textarea
          rows={3}
          placeholder="Enter any special handling instructions, reference numbers, or notes..."
          value={form.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" type="button" onClick={() => setForm({ requested_date: new Date().toISOString().split('T')[0], site_id: '', vehicle_type: 'Shuttle', cargo_type: 'General', is_bpa_cargo: false })}>
          Reset
        </Button>
        <Button type="submit" loading={createBooking.isPending}>
          Submit Booking
        </Button>
      </div>
    </form>
  );
}
