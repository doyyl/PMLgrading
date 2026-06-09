'use client';

import { Truck, User, Battery, Package, AlertTriangle, ChevronRight, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getStatusColor, getBatterySocColor, isAdrValid } from '@/lib/utils';
import type { PlanningBoardRow } from '@/types';
import { cn } from '@/lib/utils';

interface PlanCardProps {
  plan: PlanningBoardRow;
  onAssign: () => void;
  onDispatch: () => void;
}

export function PlanCard({ plan, onAssign, onDispatch }: PlanCardProps) {
  const adrExpired = plan.adr_certificate_expiry && !isAdrValid(plan.adr_certificate_expiry);
  const isEV = plan.powertrain === 'EV';
  const lowBattery = isEV && plan.battery_soc != null && plan.battery_soc < 30;

  return (
    <div
      className={cn(
        'rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md',
        plan.is_bpa_cargo && 'border-l-4 border-l-red-400',
        !plan.is_bpa_cargo && 'border-gray-200'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{plan.booking_ref}</p>
          <p className="text-xs text-gray-500 truncate mt-0.5">{plan.site_name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {plan.is_bpa_cargo && <Badge variant="danger">BPA</Badge>}
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(plan.status))}>
            {plan.status}
          </span>
        </div>
      </div>

      {/* Cargo info */}
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
        <Package className="h-3.5 w-3.5 text-gray-400" />
        <span>{plan.cargo_type}</span>
        {plan.quantity && <span className="text-gray-400">· {plan.quantity} {plan.unit}</span>}
      </div>

      {/* Driver */}
      <div className="mt-2">
        {plan.driver_name ? (
          <div className="flex items-center gap-2 text-xs">
            <User className="h-3.5 w-3.5 text-gray-400" />
            <span className="font-medium text-gray-700">{plan.driver_name}</span>
            <Badge variant="outline">{plan.driver_license}</Badge>
            {adrExpired && (
              <span className="flex items-center gap-0.5 text-red-600">
                <AlertTriangle className="h-3 w-3" /> ADR Exp.
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>No driver assigned</span>
          </div>
        )}
      </div>

      {/* Vehicle */}
      <div className="mt-1.5">
        {plan.plate_number ? (
          <div className="flex items-center gap-2 text-xs">
            <Truck className="h-3.5 w-3.5 text-gray-400" />
            <span className="font-medium text-gray-700">{plan.plate_number}</span>
            {isEV && (
              <span className={cn('flex items-center gap-0.5 font-medium', getBatterySocColor(plan.battery_soc ?? 0))}>
                <Battery className="h-3 w-3" />
                {plan.battery_soc}%
                {lowBattery && ' ⚠️'}
              </span>
            )}
            {isEV && <Badge variant="success"><Zap className="h-2.5 w-2.5" /> EV</Badge>}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Truck className="h-3.5 w-3.5" />
            <span>No vehicle assigned</span>
          </div>
        )}
      </div>

      {/* CO2 saving */}
      {plan.estimated_co2_saved && plan.estimated_co2_saved > 0 && (
        <div className="mt-2 text-xs text-emerald-600">
          ♻️ {plan.estimated_co2_saved} kg CO₂ saved
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2 border-t border-gray-50 pt-3">
        {plan.status === 'Draft' && (
          <Button size="sm" variant="outline" onClick={onAssign} className="flex-1">
            Assign
          </Button>
        )}
        {plan.status === 'Assigned' && (
          <>
            <Button size="sm" variant="outline" onClick={onAssign} className="flex-1">
              Re-assign
            </Button>
            <Button size="sm" onClick={onDispatch} className="flex-1">
              Dispatch
            </Button>
          </>
        )}
        {plan.status === 'Dispatched' && (
          <span className="text-xs text-gray-400 italic">En route…</span>
        )}
        {plan.status === 'Completed' && (
          <span className="text-xs text-emerald-600 font-medium">✓ Completed</span>
        )}
      </div>
    </div>
  );
}
