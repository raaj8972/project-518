-- Migration: Drop recursive RLS policies on registrations to resolve infinite recursion loop
-- Run with: npx supabase db push

-- Drop the policies that query across tables and create a cycle
DROP POLICY IF EXISTS "Allow public to read winner registrations" ON public.registrations;
DROP POLICY IF EXISTS "Allow approved participants to read event co-participants" ON public.registrations;
