'use client';

import { useMemo } from 'react';
import { LayoutGrid, List, ArrowLeftRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { PlanCard } from './PlanCard';
import { AssignModal } from './AssignModal';
import { ReverseLogisticsPanel } from './ReverseLogisticsPanel';
import { usePlanningBoard, useAvailableDrivers, useAvailableVehicles, useEmptyAssets, useDispatchPlan } from '@/hooks/usePlanning';
import { usePlanningStore } from '@/store/planningStore';
import { routeCategoryLabel } from '@/lib/utils';
import type { RouteCategory } from '@/types';

const CATEGORIES: { value: RouteCategory | 'ALL'; label: string; color: string }[] = [
  { value: 'ALL', label: 'All Routes', color: 'bg-gray-100 text-gray-700' },
  { value: 'Subcontract', label: 'Sub-contract', color: 'bg-purple-100 text-purple-700' },
  { value: 'BSM_STYROLUTION', label: 'BSM & STYROLUTION', color: 'bg-blue-100 text-blue-700' },
  { value: 'Shuttle', label: 'Shuttles', color: 'bg-sky-100 text-sky-700' },
  { value: 'Bulk', label: 'Bulk', color: 'bg-orange-100 text-orange-700' },
  { value: 'Vanbox', label: 'Vanbox', color: 'bg-teal-100 text-teal-700' },
];

export function PlanningBoard() {
  const { selectedDate, activeCategory, assignModalPlan, setActiveCategory, openAssignModal, closeAssignModal, setSelectedDate } = usePlanningStore();
  const dispatchPlan = useDispatchPlan();

  const { data: plans = [], isLoading } = usePlanningBoard(selectedDate, activeCategory === 'ALL' ? undefined : activeCategory);
  const { data: drivers = [] } = useAvailableDrivers(selectedDate);
  const { data: vehicles = [] } = useAvailableVehicles();
  const { data: emptyAssets = [] } = useEmptyAssets();

  const grouped = useMemo(() => {
    if (activeCategory !== 'ALL') return { [activeCategory]: plans };
    return plans.reduce<Record<string, typeof plans>>((acc, p) => {
      const key = p.route_category;
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    }, {});
  }, [plans, activeCategory]);

  const stats = useMemo(() => ({
    total: plans.length,
    assigned: plans.filter((p) => ['Assigned', 'Dispatched', 'Completed'].includes(p.status)).length,
    dispatched: plans.filter((p) => p.status === 'Dispatched').length,
    evTrips: plans.filter((p) => p.powertrain === 'EV').length,
    hazmat: plans.filter((p) => p.is_bpa_cargo).length,
  }), [plans]);

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Date picker + stats bar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Plan Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="font-medium text-gray-900">{stats.total}</span> plans ·
          <span className="font-medium text-blue-600">{stats.assigned}</span> assigned ·
          <span className="font-medium text-indigo-600">{stats.dispatched}</span> dispatched ·
          <span className="font-medium text-emerald-600">{stats.evTrips}</span> EV ·
          <span className="font-medium text-red-600">{stats.hazmat}</span> HazMat
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => {
          const count = cat.value === 'ALL' ? plans.length : plans.filter((p) => p.route_category === cat.value).length;
          return (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === cat.value
                  ? cat.color + ' ring-2 ring-offset-1 ring-blue-400'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {cat.label}
              <span className="rounded-full bg-white/50 px-1.5 py-0.5 text-xs font-semibold">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Main board */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
          )}

          {!isLoading && Object.keys(grouped).length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <LayoutGrid className="mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm">No plans found for this date</p>
            </div>
          )}

          <div className="space-y-6 pb-6">
            {Object.entries(grouped).map(([cat, catPlans]) => (
              <div key={cat}>
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-700">{routeCategoryLabel(cat)}</h3>
                  <Badge variant="outline">{catPlans.length}</Badge>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {catPlans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      onAssign={() => openAssignModal(plan)}
                      onDispatch={() => dispatchPlan.mutate(plan.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reverse Logistics sidebar */}
        <div className="hidden w-72 shrink-0 overflow-y-auto xl:block">
          <ReverseLogisticsPanel />
        </div>
      </div>

      {/* Assignment modal */}
      {assignModalPlan && (
        <AssignModal
          plan={assignModalPlan}
          drivers={drivers}
          vehicles={vehicles}
          assets={emptyAssets}
          onClose={closeAssignModal}
        />
      )}
    </div>
  );
}
