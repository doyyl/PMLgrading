'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Booking, CreateBookingForm, BookingStatus } from '@/types';

interface BookingState {
  bookings: Booking[];
  selectedBooking: Booking | null;
  filters: {
    status?: BookingStatus;
    date?: string;
    site_id?: string;
  };
  isLoading: boolean;

  setBookings: (bookings: Booking[]) => void;
  selectBooking: (booking: Booking | null) => void;
  setFilters: (filters: BookingState['filters']) => void;
  setLoading: (loading: boolean) => void;
  addBooking: (booking: Booking) => void;
  updateBooking: (id: string, updates: Partial<Booking>) => void;
}

export const useBookingStore = create<BookingState>()(
  devtools(
    (set) => ({
      bookings: [],
      selectedBooking: null,
      filters: {},
      isLoading: false,

      setBookings: (bookings) => set({ bookings }),
      selectBooking: (booking) => set({ selectedBooking: booking }),
      setFilters: (filters) => set({ filters }),
      setLoading: (isLoading) => set({ isLoading }),
      addBooking: (booking) =>
        set((state) => ({ bookings: [booking, ...state.bookings] })),
      updateBooking: (id, updates) =>
        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === id ? { ...b, ...updates } : b
          ),
        })),
    }),
    { name: 'booking-store' }
  )
);
