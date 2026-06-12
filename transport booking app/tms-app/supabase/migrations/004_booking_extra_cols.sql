-- Migration 004: Add extra columns to bookings for wizard data
-- Run in Supabase SQL Editor

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS customer        TEXT,
  ADD COLUMN IF NOT EXISTS loading_place   TEXT,
  ADD COLUMN IF NOT EXISTS delivery_place  TEXT,
  ADD COLUMN IF NOT EXISTS trip_count      INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shift           TEXT CHECK (shift IN ('DAY','NIGHT','BOTH')),
  ADD COLUMN IF NOT EXISTS csr_contact     TEXT,
  ADD COLUMN IF NOT EXISTS is_round_trip   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS activity        TEXT;
