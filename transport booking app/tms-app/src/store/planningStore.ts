'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  DailyPlan,
  PlanningBoardRow,
  RouteCategory,
  Driver,
  Vehicle,
  Asset,
} from '@/types';

interface PlanningState {
  plans: PlanningBoardRow[];
  selectedDate: string;
  activeCategory: RouteCategory | 'ALL';
  drivers: Driver[];
  vehicles: Vehicle[];
  assets: Asset[];
  assignModalPlan: PlanningBoardRow | null;
  isLoading: boolean;

  setPlans: (plans: PlanningBoardRow[]) => void;
  setSelectedDate: (date: string) => void;
  setActiveCategory: (cat: RouteCategory | 'ALL') => void;
  setDrivers: (drivers: Driver[]) => void;
  setVehicles: (vehicles: Vehicle[]) => void;
  setAssets: (assets: Asset[]) => void;
  openAssignModal: (plan: PlanningBoardRow) => void;
  closeAssignModal: () => void;
  updatePlan: (id: string, updates: Partial<PlanningBoardRow>) => void;
  setLoading: (loading: boolean) => void;
}

export const usePlanningStore = create<PlanningState>()(
  devtools(
    (set) => ({
      plans: [],
      selectedDate: new Date().toISOString().split('T')[0],
      activeCategory: 'ALL',
      drivers: [],
      vehicles: [],
      assets: [],
      assignModalPlan: null,
      isLoading: false,

      setPlans: (plans) => set({ plans }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      setActiveCategory: (cat) => set({ activeCategory: cat }),
      setDrivers: (drivers) => set({ drivers }),
      setVehicles: (vehicles) => set({ vehicles }),
      setAssets: (assets) => set({ assets }),
      openAssignModal: (plan) => set({ assignModalPlan: plan }),
      closeAssignModal: () => set({ assignModalPlan: null }),
      updatePlan: (id, updates) =>
        set((state) => ({
          plans: state.plans.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    { name: 'planning-store' }
  )
);
