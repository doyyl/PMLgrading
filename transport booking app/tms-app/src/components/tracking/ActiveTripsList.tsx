'use client';

import { MapPin, Truck, User, Zap, Navigation } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';
import { getStatusColor, getBatterySocColor } from '@/lib/utils';
import { useTrackingStore } from '@/store/trackingStore';
import type { DailyPlan } from '@/types';
import { cn } from '@/lib/utils';

interface ActiveTripsListProps {
  plans: DailyPlan[];
}

export function ActiveTripsList({ plans }: ActiveTripsListProps) {
  const { selectedPlan, selectPlan } = useTrackingStore();

  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <Truck className="mb-2 h-8 w-8 opacity-30" />
        <p className="text-sm">No active trips today</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {plans.map((plan) => {
        const isSelected = selectedPlan?.id === plan.id;
        const isEV = plan.vehicle?.powertrain === 'EV';

        return (
          <div
            key={plan.id}
            onClick={() => selectPlan(isSelected ? null : plan)}
            className={cn(
              'cursor-pointer rounded-xl border p-4 transition-all',
              isSelected
                ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {plan.booking?.booking_ref ?? plan.id.slice(0, 8)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {plan.booking?.site?.site_name ?? '—'}
                </p>
              </div>
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(plan.status))}>
                {plan.status}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
              {plan.driver && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" /> {plan.driver.name}
                </span>
              )}
              {plan.vehicle && (
                <span className="flex items-center gap-1">
                  <Truck className="h-3 w-3" /> {plan.vehicle.plate_number}
                </span>
              )}
              {isEV && plan.vehicle?.battery_soc != null && (
                <span className={cn('flex items-center gap-1 font-medium', getBatterySocColor(plan.vehicle.battery_soc))}>
                  <Zap className="h-3 w-3" /> {plan.vehicle.battery_soc}%
                </span>
              )}
            </div>

            {plan.planned_distance_km && (
              <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-400">
                <Navigation className="h-3 w-3" />
                {plan.planned_distance_km} km planned
                {plan.estimated_co2_saved && plan.estimated_co2_saved > 0 && (
                  <span className="text-emerald-500 ml-1">· ♻️ {plan.estimated_co2_saved} kg CO₂</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
