

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Booking, CreateBookingForm } from '@/types';
import toast from 'react-hot-toast';

export function useBookings(filters?: { status?: string; date?: string }) {
  return useQuery({
    queryKey: ['bookings', filters],
    queryFn: async () => {
      const supabase = createClient();
      let q = supabase
        .from('bookings')
        .select('*, site:sites!bookings_site_id_fkey(*)')
        .order('requested_date', { ascending: false });

      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.date) q = q.eq('requested_date', filters.date);

      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data as Booking[];
    },
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (form: CreateBookingForm) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bookings')
        .insert(form)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data as Booking;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Booking created successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const supabase = createClient();
      // Cancel every trip that hasn't been delivered yet, then the booking itself
      const { error: tripError } = await supabase
        .from('trips')
        .update({ status: 'cancelled' })
        .eq('booking_id', id)
        .not('status', 'in', '("completed","cancelled")');
      if (tripError) throw new Error(tripError.message);

      const { error } = await supabase
        .from('bookings')
        .update({ status: 'Cancelled' })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['admin-booking-history'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      qc.invalidateQueries({ queryKey: ['all-trips'] });
      qc.invalidateQueries({ queryKey: ['unassigned-trips'] });
      qc.invalidateQueries({ queryKey: ['driver-trips'] });
      qc.invalidateQueries({ queryKey: ['planning-stats'] });
      toast.success('ยกเลิกการจองและเที่ยวที่เกี่ยวข้องแล้ว');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateBookingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
