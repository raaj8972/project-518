-- Migration: Add is_active column to registrations
-- Run with: npx supabase db push

ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT false;
