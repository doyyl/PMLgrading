

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { DailyPlan, TrackingPoint, TripEvent, SustainabilitySummary } from '@/types';

interface TrackingState {
  activePlans: DailyPlan[];
  selectedPlan: DailyPlan | null;
  trackingPoints: TrackingPoint[];
  events: TripEvent[];
  sustainability: SustainabilitySummary[];
  isLive: boolean;

  setActivePlans: (plans: DailyPlan[]) => void;
  selectPlan: (plan: DailyPlan | null) => void;
  setTrackingPoints: (points: TrackingPoint[]) => void;
  addTrackingPoint: (point: TrackingPoint) => void;
  setEvents: (events: TripEvent[]) => void;
  addEvent: (event: TripEvent) => void;
  acknowledgeEvent: (id: string) => void;
  setSustainability: (data: SustainabilitySummary[]) => void;
  setLive: (live: boolean) => void;
}

export const useTrackingStore = create<TrackingState>()(
  devtools(
    (set) => ({
      activePlans: [],
      selectedPlan: null,
      trackingPoints: [],
      events: [],
      sustainability: [],
      isLive: true,

      setActivePlans: (activePlans) => set({ activePlans }),
      selectPlan: (plan) => set({ selectedPlan: plan }),
      setTrackingPoints: (trackingPoints) => set({ trackingPoints }),
      addTrackingPoint: (point) =>
        set((state) => ({
          trackingPoints: [point, ...state.trackingPoints].slice(0, 500),
        })),
      setEvents: (events) => set({ events }),
      addEvent: (event) =>
        set((state) => ({ events: [event, ...state.events] })),
      acknowledgeEvent: (id) =>
        set((state) => ({
          events: state.events.map((e) =>
            e.id === id ? { ...e, acknowledged: true } : e
          ),
        })),
      setSustainability: (sustainability) => set({ sustainability }),
      setLive: (isLive) => set({ isLive }),
    }),
    { name: 'tracking-store' }
  )
);
