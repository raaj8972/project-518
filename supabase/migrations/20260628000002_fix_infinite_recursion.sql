-- Migration: Fix infinite recursion in registrations RLS policy
-- Run with: npx supabase db push

-- 1. Create a security definer function to check approval status without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_approved_for_event(p_event_id text, p_user_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.registrations
    WHERE event_id = p_event_id
      AND user_id = p_user_id
      AND status = 'approved'
  );
END;
$$;

-- 2. Drop the recursive policy
DROP POLICY IF EXISTS "Allow approved participants to read event co-participants" ON public.registrations;

-- 3. Re-create the policy using the security definer function
CREATE POLICY "Allow approved participants to read event co-participants"
  ON public.registrations FOR SELECT TO authenticated
  USING (
    status = 'approved'
    AND public.is_approved_for_event(event_id, auth.uid())
  );
