

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type {
  PlanningBoardRow,
  Driver,
  Vehicle,
  Asset,
  AssignPlanForm,
  RouteCategory,
} from '@/types';
import { calculateCO2Saved } from '@/lib/utils';
import toast from 'react-hot-toast';

export function usePlanningBoard(date: string, category?: RouteCategory | 'ALL') {
  return useQuery({
    queryKey: ['planning-board', date, category],
    queryFn: async () => {
      const supabase = createClient();
      let q = supabase
        .from('vw_planning_board')
        .select('*')
        .eq('plan_date', date);

      if (category && category !== 'ALL') {
        q = q.eq('route_category', category);
      }

      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as PlanningBoardRow[];
    },
    refetchInterval: 30000,
  });
}

export function useAvailableDrivers(date: string) {
  return useQuery({
    queryKey: ['available-drivers', date],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('drivers')
        .select('*, shifts:driver_shifts(shift_date, shift_type)')
        .eq('active', true);
      if (error) throw new Error(error.message);
      return (data ?? []) as Driver[];
    },
  });
}

export function useAvailableVehicles() {
  return useQuery({
    queryKey: ['available-vehicles'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('active', true)
        .order('vehicle_type');
      if (error) throw new Error(error.message);
      return (data ?? []) as Vehicle[];
    },
  });
}

export function useEmptyAssets() {
  return useQuery({
    queryKey: ['empty-assets'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('vw_reverse_logistics')
        .select('*')
        .order('last_updated_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Asset[];
    },
    refetchInterval: 60000,
  });
}

export function useAssignPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      planId,
      form,
      powertrain,
    }: {
      planId: string;
      form: AssignPlanForm;
      powertrain?: string;
    }) => {
      const supabase = createClient();
      const co2Saved =
        powertrain === 'EV' && form.planned_distance_km
          ? calculateCO2Saved(form.planned_distance_km)
          : 0;

      const { data, error } = await supabase
        .from('daily_plans')
        .update({
          ...form,
          status: 'Assigned',
          estimated_co2_saved: co2Saved,
          updated_at: new Date().toISOString(),
        })
        .eq('id', planId)
        .select()
        .single();

      if (error) {
        const msg = error.message;
        if (msg.includes('HAZMAT_LICENSE_ERROR')) throw new Error('⚠️ License mismatch: ท.4 required for this cargo.');
        if (msg.includes('ADR_MISSING_ERROR')) throw new Error('⚠️ No ADR certificate on file for this driver.');
        if (msg.includes('ADR_EXPIRED_ERROR')) throw new Error('⚠️ ADR certificate is expired. Renewal required.');
        throw new Error(msg);
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planning-board'] });
      toast.success('Plan assigned successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message, { duration: 6000 });
    },
  });
}

export function useDispatchPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (planId: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('daily_plans')
        .update({ status: 'Dispatched', dispatched_at: new Date().toISOString() })
        .eq('id', planId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planning-board'] });
      toast.success('Plan dispatched');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDriverShifts(driverId: string, month: string) {
  return useQuery({
    queryKey: ['driver-shifts', driverId, month],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('driver_shifts')
        .select('*')
        .eq('driver_id', driverId)
        .gte('shift_date', `${month}-01`)
        .lte('shift_date', `${month}-31`);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!driverId,
  });
}
