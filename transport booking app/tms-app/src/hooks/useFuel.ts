import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export interface FuelLog {
  id: string;
  driver_id: string | null;
  vehicle_id: string;
  trip_id: string | null;
  odometer_km: number;
  liters: number | null;
  total_baht: number | null;
  station: string | null;
  note: string | null;
  slip_photo_url: string | null;
  status: 'open' | 'closed';
  created_at: string;
  closed_at: string | null;
  vehicle?: { id: string; plate_number: string } | null;
}

export interface VehicleOption {
  id: string;
  plate_number: string;
}

const FUEL_QUERY_KEYS = ['fuel-logs', 'last-odometer'] as const;

function invalidateFuelQueries(qc: ReturnType<typeof useQueryClient>) {
  for (const key of FUEL_QUERY_KEYS) qc.invalidateQueries({ queryKey: [key] });
}

// ── The driver's fuel logs (open + closed history) ────────────
export function useFuelLogs(driverId: string | null) {
  return useQuery({
    queryKey: ['fuel-logs', driverId],
    enabled: !!driverId,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('fuel_logs')
        .select('*, vehicle:vehicles(id, plate_number)')
        .eq('driver_id', driverId!)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as FuelLog[];
    },
  });
}

// ── Active vehicle from the driver's in-progress trip (auto-fill) ──
export function useActiveVehicle(driverId: string | null) {
  return useQuery({
    queryKey: ['fuel-active-vehicle', driverId],
    enabled: !!driverId,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('trips')
        .select('vehicle:vehicles(id, plate_number)')
        .eq('driver_id', driverId!)
        .eq('status', 'in_progress')
        .not('vehicle_id', 'is', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      const raw = data?.vehicle as VehicleOption | VehicleOption[] | null;
      return (Array.isArray(raw) ? raw[0] : raw) ?? null;
    },
  });
}

// ── Active vehicles master list (fallback vehicle picker) ─────
export function useVehicleOptions() {
  return useQuery({
    queryKey: ['fuel-vehicle-options'],
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('vehicles')
        .select('id, plate_number')
        .eq('active', true)
        .order('plate_number');
      if (error) throw new Error(error.message);
      return (data ?? []) as VehicleOption[];
    },
  });
}

// ── Last recorded odometer for a vehicle (soft decreasing warning) ──
export function useLastOdometer(vehicleId: string | null) {
  return useQuery({
    queryKey: ['last-odometer', vehicleId],
    enabled: !!vehicleId,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('fuel_logs')
        .select('odometer_km')
        .eq('vehicle_id', vehicleId!)
        .order('odometer_km', { ascending: false })
        .limit(1)
        .maybeSingle<{ odometer_km: number }>();
      if (error) throw new Error(error.message);
      return data?.odometer_km ?? null;
    },
  });
}

// ── Step 1: open a fuel record with the odometer reading ──────
export function useStartFuel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      driverId: string;
      vehicleId: string;
      odometerKm: number;
      tripId?: string | null;
    }) => {
      const { error } = await createClient()
        .from('fuel_logs')
        .insert({
          driver_id: input.driverId,
          vehicle_id: input.vehicleId,
          trip_id: input.tripId ?? null,
          odometer_km: input.odometerKm,
          status: 'open',
        });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidateFuelQueries(qc),
  });
}

// ── Step 2: close the record — slip photo is required ─────────
export function useCloseFuel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      fuelLogId: string;
      slipPhotoUrl: string;
      liters?: number | null;
      totalBaht?: number | null;
      station?: string | null;
      note?: string | null;
    }) => {
      if (!input.slipPhotoUrl) throw new Error('ต้องแนบสลิปก่อนถึงจะปิดได้');
      const { data, error } = await createClient()
        .from('fuel_logs')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          slip_photo_url: input.slipPhotoUrl,
          liters: input.liters ?? null,
          total_baht: input.totalBaht ?? null,
          station: input.station ?? null,
          note: input.note ?? null,
        })
        .eq('id', input.fuelLogId)
        .eq('status', 'open')
        .select('id');
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) throw new Error('ปิดไม่ได้ — รายการนี้ถูกปิดไปแล้ว');
    },
    onSuccess: () => invalidateFuelQueries(qc),
  });
}

// ── Upload a slip photo to the shared trip-photos bucket ──────
export async function uploadFuelSlip(fuelLogId: string, file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `fuel/${fuelLogId}_${Date.now()}.${ext}`;
  const { data, error } = await supabase.storage
    .from('trip-photos').upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw new Error(error.message);
  return supabase.storage.from('trip-photos').getPublicUrl(data.path).data.publicUrl;
}
