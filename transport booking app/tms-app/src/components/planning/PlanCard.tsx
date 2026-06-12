

import { Truck, User, Battery, Package, AlertTriangle, Zap, MapPin, ArrowRight } from 'lucide-react';
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

const TRUCK_TYPE_SHORT: Record<string, string> = {
  "Dock loading (ตู้ทึบเปิดท้าย)": "Dock",
  "Side Loading (รถพ่วงเปิดข้าง)": "Side",
  "Side Loading (รถผ้าใบเปิดข้าง)": "Canvas",
  "Bulk Truck": "Bulk",
  "40' HQ": "40'HQ",
  "รถ 3 เพลา": "10W",
};

export function PlanCard({ plan, onAssign, onDispatch }: PlanCardProps) {
  const adrExpired = plan.adr_certificate_expiry && !isAdrValid(plan.adr_certificate_expiry);
  const isEV = plan.powertrain === 'EV';
  const lowBattery = isEV && plan.battery_soc != null && plan.battery_soc < 30;
  const truckShort = plan.vehicle_type ? TRUCK_TYPE_SHORT[plan.vehicle_type] ?? plan.vehicle_type : null;

  return (
    <div className={cn(
      'rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md flex flex-col gap-3',
      plan.is_bpa_cargo ? 'border-l-4 border-l-red-400' : 'border-gray-200'
    )}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{plan.booking_ref}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
            <p className="text-xs text-gray-500 truncate">{plan.site_name}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1 flex-wrap justify-end">
          {plan.is_bpa_cargo && <Badge variant="danger">BPA</Badge>}
          {plan.cargo_type === 'Chemical' && !plan.is_bpa_cargo && <Badge variant="warning">Chem</Badge>}
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(plan.status))}>
            {plan.status}
          </span>
        </div>
      </div>

      {/* Route */}
      <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
        <Package className="h-3 w-3 text-gray-400 shrink-0" />
        <span className="font-medium truncate">{plan.cargo_type}</span>
        {plan.quantity && <span className="text-gray-400 shrink-0">· {plan.quantity} {plan.unit}</span>}
        {truckShort && (
          <span className="ml-auto shrink-0 rounded bg-gray-200 px-1.5 py-0.5 text-xs font-semibold text-gray-600">
            {truckShort}
          </span>
        )}
      </div>

      {/* Driver */}
      <div>
        {plan.driver_name ? (
          <div className="flex items-center gap-2 text-xs">
            <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span className="font-medium text-gray-700 truncate">{plan.driver_name}</span>
            <Badge variant="outline">{plan.driver_license}</Badge>
            {adrExpired && (
              <span className="flex items-center gap-0.5 text-red-600 shrink-0">
                <AlertTriangle className="h-3 w-3" /> ADR!
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
      <div>
        {plan.plate_number ? (
          <div className="flex items-center gap-2 text-xs">
            <Truck className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span className="font-medium text-gray-700">{plan.plate_number}</span>
            {isEV ? (
              <>
                <span className={cn('flex items-center gap-0.5 font-semibold', getBatterySocColor(plan.battery_soc ?? 0))}>
                  <Battery className="h-3 w-3" />{plan.battery_soc}%{lowBattery && ' ⚠️'}
                </span>
                <Badge variant="success"><Zap className="h-2.5 w-2.5 mr-0.5" />EV</Badge>
              </>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Truck className="h-3.5 w-3.5" /><span>No vehicle assigned</span>
          </div>
        )}
      </div>

      {/* CO2 saving */}
      {plan.estimated_co2_saved && plan.estimated_co2_saved > 0 && (
        <p className="text-xs text-emerald-600">♻️ {plan.estimated_co2_saved} kg CO₂ saved</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-gray-100 pt-3 mt-auto">
        {plan.status === 'Draft' && (
          <Button size="sm" variant="outline" onClick={onAssign} className="flex-1">Assign</Button>
        )}
        {plan.status === 'Assigned' && (
          <>
            <Button size="sm" variant="outline" onClick={onAssign} className="flex-1">Re-assign</Button>
            <Button size="sm" onClick={onDispatch} className="flex-1">Dispatch</Button>
          </>
        )}
        {plan.status === 'Dispatched' && (
          <span className="text-xs text-blue-500 italic">En route…</span>
        )}
        {plan.status === 'Completed' && (
          <span className="text-xs text-emerald-600 font-medium">✓ Completed</span>
        )}
      </div>
    </div>
  );
}
