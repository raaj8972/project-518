-- Migration: Fix site_settings RLS policies and update function search_path
-- Ensures admins can update site settings without encountering permission denied errors.

-- 1. Drop all potential existing policies on site_settings
DROP POLICY IF EXISTS "Anyone can read site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_select" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_insert" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_update" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_admin_all" ON public.site_settings;
DROP POLICY IF EXISTS "Allow public read access" ON public.site_settings;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.site_settings;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.site_settings;

-- 2. Re-create the helper function with explicit search_path to prevent schema cache lookup errors
CREATE OR REPLACE FUNCTION public.can_edit_site_settings() 
RETURNS boolean
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
begin
  return exists (
    select 1 from public.admin_users
    where user_id = auth.uid()::text
      and role in ('admin', 'owner')
  );
end;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.can_edit_site_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_site_settings() TO anon;
GRANT EXECUTE ON FUNCTION public.can_edit_site_settings() TO service_role;

-- 3. Ensure RLS is enabled
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- 4. Create clean, permissive policies for select, insert, and update
CREATE POLICY "site_settings_select_policy" ON public.site_settings
  FOR SELECT USING (true);

CREATE POLICY "site_settings_insert_policy" ON public.site_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_site_settings());

CREATE POLICY "site_settings_update_policy" ON public.site_settings
  FOR UPDATE TO authenticated
  USING (public.can_edit_site_settings())
  WITH CHECK (public.can_edit_site_settings());
