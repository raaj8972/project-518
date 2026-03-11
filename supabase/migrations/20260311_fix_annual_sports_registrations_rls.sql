-- Migration: Fix RLS for Annual Sports Registrations
-- Description: Adds UPDATE and DELETE policies for authenticated users (admins/coordinators)

-- 1. Ensure authenticated users can manage all aspects of registrations
DROP POLICY IF EXISTS "Admins Manage Registrations" ON public.annual_sports_registrations;
CREATE POLICY "Admins Manage Registrations" ON public.annual_sports_registrations
FOR ALL USING (auth.role() = 'authenticated');

-- 2. Preserve Public's ability to insert (for non-logged in users if applicable)
-- We already have "Public Insert Registrations" FOR INSERT WITH CHECK (true) from previous migrations.

-- 3. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
