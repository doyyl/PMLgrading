'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { DailyPlan, TrackingPoint, TripEvent, SustainabilitySummary } from '@/types';
import { useTrackingStore } from '@/store/trackingStore';
import toast from 'react-hot-toast';

export function useActivePlans(date: string) {
  return useQuery({
    queryKey: ['active-plans', date],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('daily_plans')
        .select('*, driver:drivers(*), vehicle:vehicles(*), booking:bookings(*, site:sites!bookings_site_id_fkey(*))')
        .eq('plan_date', date)
        .in('status', ['Dispatched', 'In Progress']);
      if (error) throw new Error(error.message);
      return (data ?? []) as DailyPlan[];
    },
    refetchInterval: 15000,
  });
}

export function useTrackingHistory(planId: string) {
  return useQuery({
    queryKey: ['tracking', planId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tracking')
        .select('*')
        .eq('plan_id', planId)
        .order('recorded_at', { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return (data ?? []) as TrackingPoint[];
    },
    enabled: !!planId,
    refetchInterval: 10000,
  });
}

export function useLiveEvents(planId?: string) {
  const addEvent = useTrackingStore((s) => s.addEvent);

  useEffect(() => {
    if (!planId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`trip_events_${planId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trip_events',
          filter: `plan_id=eq.${planId}`,
        },
        (payload) => {
          const event = payload.new as TripEvent;
          addEvent(event);
          if (event.severity === 'Critical') {
            toast.error(`🚨 ${event.event_type}: ${event.description ?? ''}`, { duration: 10000 });
          } else if (event.severity === 'Warning') {
            toast(`⚠️ ${event.event_type}`, { duration: 6000 });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [planId, addEvent]);
}

export function useTripEvents(planId: string) {
  return useQuery({
    queryKey: ['trip-events', planId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('trip_events')
        .select('*')
        .eq('plan_id', planId)
        .order('recorded_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as TripEvent[];
    },
    enabled: !!planId,
  });
}

export function useAcknowledgeEvent() {
  const qc = useQueryClient();
  const acknowledgeEvent = useTrackingStore((s) => s.acknowledgeEvent);
  return useMutation({
    mutationFn: async (eventId: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('trip_events')
        .update({ acknowledged: true, ack_at: new Date().toISOString() })
        .eq('id', eventId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, eventId) => {
      acknowledgeEvent(eventId);
      qc.invalidateQueries({ queryKey: ['trip-events'] });
    },
  });
}

export function useSustainability() {
  return useQuery({
    queryKey: ['sustainability'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('vw_sustainability')
        .select('*')
        .limit(12);
      if (error) throw new Error(error.message);
      return (data ?? []) as SustainabilitySummary[];
    },
  });
}
