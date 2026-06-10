import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export interface Trip {
  id: string;
  plan_id: string;
  driver_id: string;
  trip_number: number;
  destination: string | null;
  customer: string | null;
  cargo_notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  close_photo_url: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
}

export interface TripPlan {
  id: string;
  plan_date: string;
  status: string;
  route_category: string | null;
  dispatch_notes: string | null;
  trip_count: number | null;
  booking: {
    booking_ref: string;
    customer: string | null;
    delivery_place: string | null;
    loading_place: string | null;
    cargo_type: string;
    is_bpa_cargo: boolean;
  } | null;
  vehicle: { plate_number: string; vehicle_type: string } | null;
  trips?: Trip[];
}

export function useDriverPlans(driverId: string | null) {
  return useQuery({
    queryKey: ['driver-plans-v2', driverId],
    enabled: !!driverId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
      const { data, error } = await createClient()
        .from('daily_plans')
        .select(`
          id, plan_date, status, route_category, dispatch_notes, trip_count,
          booking:bookings!daily_plans_booking_id_fkey(
            booking_ref, customer, delivery_place, loading_place, cargo_type, is_bpa_cargo
          ),
          vehicle:vehicles(plate_number, vehicle_type)
        `)
        .eq('driver_id', driverId!)
        .gte('plan_date', weekAgo)
        .order('plan_date', { ascending: false });
      if (error) throw new Error(error.message);
      return data as TripPlan[];
    },
  });
}

export function useTripsForPlan(planId: string | null) {
  return useQuery({
    queryKey: ['trips', planId],
    enabled: !!planId,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('trips')
        .select('*')
        .eq('plan_id', planId!)
        .order('trip_number');
      if (error) throw new Error(error.message);
      return data as Trip[];
    },
  });
}

export function useCreateTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      plan_id: string;
      driver_id: string;
      trip_number: number;
      destination: string;
      customer: string;
      cargo_notes: string;
    }) => {
      const { data, error } = await createClient()
        .from('trips')
        .insert({
          ...payload,
          started_at: new Date().toISOString(),
          status: 'in_progress',
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Trip;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['trips', v.plan_id] });
      qc.invalidateQueries({ queryKey: ['driver-plans-v2'] });
    },
  });
}

export function useCompleteTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tripId, photoUrl, planId,
    }: { tripId: string; photoUrl: string; planId: string }) => {
      const { error } = await createClient()
        .from('trips')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          close_photo_url: photoUrl,
        })
        .eq('id', tripId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['trips', v.planId] });
      qc.invalidateQueries({ queryKey: ['driver-plans-v2'] });
      qc.invalidateQueries({ queryKey: ['manager-workload'] });
      qc.invalidateQueries({ queryKey: ['all-plans-trips'] });
    },
  });
}

export async function uploadTripPhoto(tripId: string, file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `trips/${tripId}_${Date.now()}.${ext}`;

  const { data, error } = await supabase.storage
    .from('trip-photos')
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) throw new Error(`อัพโหลดรูปไม่สำเร็จ: ${error.message}`);

  const { data: { publicUrl } } = supabase.storage
    .from('trip-photos')
    .getPublicUrl(data.path);

  return publicUrl;
}

export function useAllPlansWithTrips() {
  const from = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  return useQuery({
    queryKey: ['all-plans-trips'],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('daily_plans')
        .select(`
          id, plan_date, status, route_category, trip_count,
          booking:bookings!daily_plans_booking_id_fkey(booking_ref, customer, delivery_place, cargo_type),
          driver:drivers(id, name),
          vehicle:vehicles(plate_number),
          trips(id, status, started_at, completed_at)
        `)
        .gte('plan_date', from)
        .order('plan_date', { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useDriverWorkload() {
  return useQuery({
    queryKey: ['manager-workload'],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data: plans, error } = await createClient()
        .from('daily_plans')
        .select(`
          id, status,
          driver:drivers(id, name),
          trips(id, status)
        `)
        .not('driver_id', 'is', null);
      if (error) throw new Error(error.message);

      type WorkloadEntry = {
        driver: { id: string; name: string };
        total: number; completed: number; inProgress: number; pending: number;
        totalTrips: number; completedTrips: number;
      };

      const map = new Map<string, WorkloadEntry>();
      for (const plan of plans ?? []) {
        const d = plan.driver as { id: string; name: string } | null;
        if (!d) continue;
        if (!map.has(d.id)) {
          map.set(d.id, { driver: d, total: 0, completed: 0, inProgress: 0, pending: 0, totalTrips: 0, completedTrips: 0 });
        }
        const e = map.get(d.id)!;
        e.total++;
        if (plan.status === 'Completed') e.completed++;
        else if (plan.status === 'Dispatched' || plan.status === 'Assigned') e.inProgress++;
        else e.pending++;

        const trips = (plan.trips ?? []) as { id: string; status: string }[];
        e.totalTrips += trips.length;
        e.completedTrips += trips.filter(t => t.status === 'completed').length;
      }
      return Array.from(map.values()).sort((a, b) => b.total - a.total);
    },
  });
}
