import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export interface Trip {
  id: string;
  booking_id: string;
  driver_id: string | null;
  vehicle_id: string | null;
  trip_number: number;
  scheduled_date: string | null;
  customer: string | null;
  loading_place: string | null;
  destination: string | null;
  cargo_notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  close_photo_url: string | null;
  status: 'unassigned' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  booking?: { booking_ref: string; requested_date: string; vehicle_type: string; cargo_type: string; is_bpa_cargo: boolean } | null;
  driver?: { id: string; name: string } | null;
  vehicle?: { id: string; plate_number: string } | null;
}

const WEEK_AGO = () => new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
const TODAY    = () => new Date().toISOString().split('T')[0];

// ── Planning board — all trips ────────────────────────────────
export function useAllTrips() {
  return useQuery({
    queryKey: ['all-trips'],
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('trips')
        .select(`
          *,
          booking:bookings!trips_booking_id_fkey(booking_ref, requested_date, vehicle_type, cargo_type, is_bpa_cargo),
          driver:drivers(id, name),
          vehicle:vehicles(id, plate_number)
        `)
        .gte('scheduled_date', WEEK_AGO())
        .neq('status', 'cancelled')
        .order('scheduled_date', { ascending: false })
        .order('customer')
        .order('trip_number');
      if (error) throw new Error(error.message);
      return (data ?? []) as Trip[];
    },
  });
}

// ── Planning stats ────────────────────────────────────────────
export function usePlanningStats() {
  return useQuery({
    queryKey: ['planning-stats'],
    refetchInterval: 20_000,
    queryFn: async () => {
      const today = TODAY();
      const supabase = createClient();
      const [bk, trips] = await Promise.all([
        supabase.from('bookings').select('id', { count: 'exact', head: true }),
        supabase.from('trips').select('status, scheduled_date').neq('status', 'cancelled'),
      ]);
      const all = trips.data ?? [];
      const todayTrips = all.filter(t => t.scheduled_date === today);
      return {
        totalBookings:   bk.count ?? 0,
        unassigned:      all.filter(t => t.status === 'unassigned').length,
        todayRunning:    todayTrips.filter(t => t.status === 'in_progress' || t.status === 'assigned').length,
        todayCompleted:  todayTrips.filter(t => t.status === 'completed').length,
      };
    },
  });
}

// ── Driver's trips ────────────────────────────────────────────
export function useDriverTrips(driverId: string | null) {
  return useQuery({
    queryKey: ['driver-trips', driverId],
    enabled: !!driverId,
    refetchInterval: 10_000,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('trips')
        .select(`
          *,
          booking:bookings!trips_booking_id_fkey(booking_ref, vehicle_type, cargo_type),
          vehicle:vehicles(id, plate_number)
        `)
        .eq('driver_id', driverId!)
        .gte('scheduled_date', WEEK_AGO())
        .neq('status', 'cancelled')
        .order('scheduled_date', { ascending: false })
        .order('trip_number');
      if (error) throw new Error(error.message);
      return (data ?? []) as Trip[];
    },
  });
}

// ── Unassigned trips (driver can claim) ──────────────────────
export function useUnassignedTrips() {
  return useQuery({
    queryKey: ['unassigned-trips'],
    refetchInterval: 10_000,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('trips')
        .select(`
          *,
          booking:bookings!trips_booking_id_fkey(booking_ref, vehicle_type, is_bpa_cargo)
        `)
        .eq('status', 'unassigned')
        .gte('scheduled_date', TODAY())
        .order('scheduled_date')
        .order('customer')
        .order('trip_number');
      if (error) throw new Error(error.message);
      return (data ?? []) as Trip[];
    },
  });
}

// ── Tracking page ─────────────────────────────────────────────
export function useTrackingTrips() {
  return useQuery({
    queryKey: ['tracking-trips'],
    refetchInterval: 10_000,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('trips')
        .select(`
          *,
          booking:bookings!trips_booking_id_fkey(booking_ref, vehicle_type, cargo_type),
          driver:drivers(id, name)
        `)
        .gte('scheduled_date', TODAY())
        .not('status', 'in', '("unassigned","cancelled")')
        .order('driver_id')
        .order('trip_number');
      if (error) throw new Error(error.message);
      return (data ?? []) as Trip[];
    },
  });
}

// ── Driver workload (Manager) ─────────────────────────────────
export function useDriverWorkload() {
  return useQuery({
    queryKey: ['manager-workload'],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('trips')
        .select('id, status, driver:drivers(id, name)')
        .not('driver_id', 'is', null)
        .neq('status', 'cancelled');
      if (error) throw new Error(error.message);

      type Entry = { driver: { id: string; name: string }; total: number; inProgress: number; completed: number; assigned: number };
      const map = new Map<string, Entry>();
      for (const t of data ?? []) {
        const raw = t.driver as { id: string; name: string } | { id: string; name: string }[] | null;
        const d = Array.isArray(raw) ? raw[0] : raw;
        if (!d) continue;
        if (!map.has(d.id)) map.set(d.id, { driver: d, total: 0, inProgress: 0, completed: 0, assigned: 0 });
        const e = map.get(d.id)!;
        e.total++;
        if (t.status === 'in_progress') e.inProgress++;
        else if (t.status === 'completed') e.completed++;
        else if (t.status === 'assigned') e.assigned++;
      }
      return Array.from(map.values()).sort((a, b) => b.total - a.total);
    },
  });
}

// ── Mutations ─────────────────────────────────────────────────

// BPA / hazmat cargo requires a ท.4 license with a valid ADR certificate
export function isDriverBpaQualified(d: { license_type?: string | null; adr_certificate_expiry?: string | null }) {
  return d.license_type === 'ท.4'
    && !!d.adr_certificate_expiry
    && new Date(d.adr_certificate_expiry) >= new Date();
}

async function assertBpaQualified(tripId: string, driverId: string) {
  const supabase = createClient();
  const [tripRes, driverRes] = await Promise.all([
    supabase.from('trips')
      .select('id, booking:bookings!trips_booking_id_fkey(is_bpa_cargo)')
      .eq('id', tripId).single(),
    supabase.from('drivers')
      .select('license_type, adr_certificate_expiry')
      .eq('id', driverId).single(),
  ]);
  const rawBooking = tripRes.data?.booking as { is_bpa_cargo: boolean } | { is_bpa_cargo: boolean }[] | null;
  const booking = Array.isArray(rawBooking) ? rawBooking[0] : rawBooking;
  if (booking?.is_bpa_cargo && driverRes.data && !isDriverBpaQualified(driverRes.data)) {
    throw new Error('งานนี้เป็นสินค้า BPA — พนักงานต้องมีใบขับขี่ ท.4 และใบ ADR ที่ยังไม่หมดอายุ');
  }
}

export function useClaimTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tripId, driverId }: { tripId: string; driverId: string }) => {
      await assertBpaQualified(tripId, driverId);
      // .select() makes the claim atomic — zero rows back means someone else won the race
      const { data, error } = await createClient()
        .from('trips')
        .update({ driver_id: driverId, status: 'assigned' })
        .eq('id', tripId)
        .eq('status', 'unassigned')
        .select('id');
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) throw new Error('งานนี้ถูกพนักงานคนอื่นรับไปแล้ว');
    },
    onSuccess: () => invalidateTripQueries(qc),
  });
}

export function useAssignTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tripId, driverId, vehicleId }: { tripId: string; driverId: string; vehicleId?: string | null }) => {
      await assertBpaQualified(tripId, driverId);
      const { error } = await createClient()
        .from('trips')
        .update({
          driver_id: driverId,
          status: 'assigned',
          ...(vehicleId !== undefined ? { vehicle_id: vehicleId } : {}),
        })
        .eq('id', tripId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidateTripQueries(qc),
  });
}

const TRIP_QUERY_KEYS = ['all-trips', 'driver-trips', 'unassigned-trips', 'tracking-trips', 'planning-stats', 'manager-workload', 'manager-stats', 'day-load'] as const;

function invalidateTripQueries(qc: ReturnType<typeof useQueryClient>) {
  for (const key of TRIP_QUERY_KEYS) qc.invalidateQueries({ queryKey: [key] });
}

// ── Per-driver load for a given date (assign modal) ──────────
export function useDriverDayLoad(date: string | null) {
  return useQuery({
    queryKey: ['day-load', date],
    enabled: !!date,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('trips')
        .select('driver_id, status')
        .eq('scheduled_date', date!)
        .neq('status', 'cancelled')
        .not('driver_id', 'is', null);
      if (error) throw new Error(error.message);
      const counts = new Map<string, number>();
      for (const t of data ?? []) {
        if (t.driver_id) counts.set(t.driver_id, (counts.get(t.driver_id) ?? 0) + 1);
      }
      return counts;
    },
  });
}

export function useUnassignTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tripId }: { tripId: string }) => {
      const { data, error } = await createClient()
        .from('trips')
        .update({ driver_id: null, status: 'unassigned' })
        .eq('id', tripId)
        .eq('status', 'assigned')
        .select('id');
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) throw new Error('ถอนมอบหมายไม่ได้ — งานเริ่มวิ่งไปแล้ว');
    },
    onSuccess: () => invalidateTripQueries(qc),
  });
}

export function useCancelTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tripId, reason }: { tripId: string; reason?: string }) => {
      const { data, error } = await createClient()
        .from('trips')
        .update({ status: 'cancelled', ...(reason ? { cargo_notes: `[ยกเลิก] ${reason}` } : {}) })
        .eq('id', tripId)
        .neq('status', 'completed')
        .select('id');
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) throw new Error('ยกเลิกไม่ได้ — งานปิดไปแล้ว');
    },
    onSuccess: () => invalidateTripQueries(qc),
  });
}

export function useStartTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tripId, notes }: { tripId: string; notes?: string }) => {
      const { error } = await createClient()
        .from('trips')
        .update({ status: 'in_progress', started_at: new Date().toISOString(), ...(notes ? { cargo_notes: notes } : {}) })
        .eq('id', tripId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidateTripQueries(qc),
  });
}

export function useCompleteTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tripId, photoUrl, cargoNotes }: { tripId: string; photoUrl: string; cargoNotes?: string }) => {
      const { error } = await createClient()
        .from('trips')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          close_photo_url: photoUrl,
          ...(cargoNotes ? { cargo_notes: cargoNotes } : {}),
        })
        .eq('id', tripId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidateTripQueries(qc),
  });
}

export async function uploadTripPhoto(tripId: string, file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `trips/${tripId}_${Date.now()}.${ext}`;
  const { data, error } = await supabase.storage
    .from('trip-photos').upload(path, file, { contentType: file.type, upsert: true });
  if (error) {
    if (error.message.includes('Bucket not found') || error.message.includes('bucket'))
      throw new Error('Storage bucket "trip-photos" ยังไม่ได้สร้าง — ไปที่ Supabase Dashboard → Storage → สร้าง bucket ชื่อ trip-photos (Public)');
    throw new Error(`อัพโหลดรูปไม่สำเร็จ: ${error.message}`);
  }
  return supabase.storage.from('trip-photos').getPublicUrl(data.path).data.publicUrl;
}
