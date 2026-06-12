

import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Battery, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAssignPlan, useDriverShifts } from '@/hooks/usePlanning';
import { useAssignmentValidation } from '@/hooks/useValidation';
import { usePlanningStore } from '@/store/planningStore';
import { getBatterySocColor, formatDate } from '@/lib/utils';
import type { Driver, Vehicle, Asset, PlanningBoardRow } from '@/types';
import { cn } from '@/lib/utils';

interface AssignModalProps {
  plan: PlanningBoardRow;
  drivers: Driver[];
  vehicles: Vehicle[];
  assets: Asset[];
  onClose: () => void;
}

export function AssignModal({ plan, drivers, vehicles, assets, onClose }: AssignModalProps) {
  const assignPlan = useAssignPlan();

  const [driverId, setDriverId] = useState(plan.driver_name ? '' : '');
  const [vehicleId, setVehicleId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [distanceKm, setDistanceKm] = useState<number | undefined>(plan.planned_distance_km);
  const [notes, setNotes] = useState(plan.dispatch_notes ?? '');

  const selectedDriver = drivers.find((d) => d.id === driverId) ?? null;
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId) ?? null;

  // Fetch driver shifts for shift-availability validation
  const month = plan.plan_date.slice(0, 7);
  const { data: shifts = [] } = useDriverShifts(driverId, month);

  // Build a mock booking for validation
  const mockBooking = {
    id: plan.id,
    booking_ref: plan.booking_ref,
    requested_date: plan.plan_date,
    site_id: '',
    vehicle_type: plan.vehicle_type!,
    cargo_type: plan.cargo_type,
    is_bpa_cargo: plan.is_bpa_cargo,
    quantity: plan.quantity,
    unit: plan.unit,
    status: 'Confirmed' as const,
    created_at: '',
    updated_at: '',
  };

  const validation = useAssignmentValidation({
    driver: selectedDriver,
    vehicle: selectedVehicle,
    booking: mockBooking,
    shifts,
    planDate: plan.plan_date,
    plannedDistanceKm: distanceKm,
  });

  async function handleAssign() {
    if (!driverId || !vehicleId) return;
    await assignPlan.mutateAsync({
      planId: plan.id,
      form: {
        driver_id: driverId,
        vehicle_id: vehicleId,
        asset_id: assetId || undefined,
        planned_distance_km: distanceKm,
        dispatch_notes: notes,
      },
      powertrain: selectedVehicle?.powertrain,
    });
    if (!assignPlan.isError) onClose();
  }

  return (
    <Modal open title={`Assign Plan — ${plan.booking_ref}`} onClose={onClose} size="lg">
      <div className="space-y-5">
        {/* Plan summary */}
        <div className="rounded-xl bg-gray-50 p-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Date</span>
            <p className="font-medium">{formatDate(plan.plan_date)}</p>
          </div>
          <div>
            <span className="text-gray-500">Site</span>
            <p className="font-medium">{plan.site_name}</p>
          </div>
          <div>
            <span className="text-gray-500">Cargo</span>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="font-medium">{plan.cargo_type}</p>
              {plan.is_bpa_cargo && <Badge variant="danger">BPA</Badge>}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Category</span>
            <p className="font-medium">{plan.route_category}</p>
          </div>
        </div>

        {/* Validation feedback */}
        {validation.errors.length > 0 && (
          <div className="space-y-2">
            {validation.errors.map((e) => (
              <div key={e.code} className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <span>{e.message}</span>
              </div>
            ))}
          </div>
        )}
        {validation.warnings.map((w) => (
          <div key={w.code} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>{w.message}</span>
          </div>
        ))}
        {validation.valid && driverId && vehicleId && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            All constraints satisfied — ready to assign.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Driver selection */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Driver</label>
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select driver...</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {d.license_type}
                  {d.driver_category === 'Bulk' ? ' (Bulk)' : ' (Shuttle)'}
                </option>
              ))}
            </select>
            {selectedDriver && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <ShieldCheck className="h-3.5 w-3.5" />
                ADR: {selectedDriver.adr_certificate_expiry
                  ? formatDate(selectedDriver.adr_certificate_expiry)
                  : 'Not on file'}
              </div>
            )}
          </div>

          {/* Vehicle selection */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Vehicle</label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select vehicle...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate_number} — {v.vehicle_type}
                  {v.powertrain === 'EV' ? ` ⚡ ${v.battery_soc}%` : ''}
                  {v.ownership === 'Subcontract' ? ' (Sub)' : ''}
                </option>
              ))}
            </select>
            {selectedVehicle?.powertrain === 'EV' && (
              <div className={cn('flex items-center gap-1.5 text-xs font-medium', getBatterySocColor(selectedVehicle.battery_soc ?? 0))}>
                <Battery className="h-3.5 w-3.5" />
                SOC: {selectedVehicle.battery_soc}% — ~{Math.round((selectedVehicle.battery_soc! / 100) * (selectedVehicle.range_km ?? 300))} km range
              </div>
            )}
          </div>

          {/* Asset (optional) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Asset / ISO Tank <span className="text-gray-400">(optional)</span></label>
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">No asset</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.asset_id} — {a.asset_type} ({a.status})
                </option>
              ))}
            </select>
          </div>

          {/* Planned distance */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Planned Distance (km)</label>
            <input
              type="number"
              min={0}
              value={distanceKm ?? ''}
              onChange={(e) => setDistanceKm(e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="e.g. 150"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {selectedVehicle?.powertrain === 'EV' && distanceKm && (
              <p className="text-xs text-emerald-600">
                ♻️ Est. CO₂ saved: {(distanceKm * 0.938).toFixed(1)} kg vs diesel
              </p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Dispatch Notes</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special instructions for the dispatcher..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleAssign}
            loading={assignPlan.isPending}
            disabled={!driverId || !vehicleId || validation.errors.length > 0}
          >
            Confirm Assignment
          </Button>
        </div>
      </div>
    </Modal>
  );
}
