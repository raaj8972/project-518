-- 1. Fix the is_owner() function once and for all (Security Definer to break recursion)
CREATE OR REPLACE FUNCTION public.is_owner()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid()::text 
    AND role = 'owner'
  );
END;
$function$;

-- 2. Clean up admin_users policies
DROP POLICY IF EXISTS "Public read for admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_select_all" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_insert" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_update" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_delete" ON public.admin_users;

-- Recreate admin_users policies
CREATE POLICY "Public read for admin_users" ON public.admin_users FOR SELECT TO public USING (true);
CREATE POLICY "Owners manage admin_users" ON public.admin_users FOR ALL TO authenticated USING (is_owner());

-- 3. Clean up admin_permissions policies
DROP POLICY IF EXISTS "admin_permissions_select" ON public.admin_permissions;
DROP POLICY IF EXISTS "admin_permissions_insert" ON public.admin_permissions;
DROP POLICY IF EXISTS "admin_permissions_update" ON public.admin_permissions;
DROP POLICY IF EXISTS "admin_permissions_delete" ON public.admin_permissions;
DROP POLICY IF EXISTS "Public read for admin_permissions" ON public.admin_permissions;

-- Recreate admin_permissions policies
CREATE POLICY "Public read for admin_permissions" ON public.admin_permissions FOR SELECT TO public USING (true);
CREATE POLICY "Owners manage admin_permissions" ON public.admin_permissions FOR ALL TO authenticated USING (is_owner());

-- 4. Clean up allowed_admins policies
DROP POLICY IF EXISTS "Public read for allowed_admins" ON public.allowed_admins;
DROP POLICY IF EXISTS "Owners can manage whitelist" ON public.allowed_admins;
DROP POLICY IF EXISTS "Authenticated users can read whitelist" ON public.allowed_admins;

-- Recreate allowed_admins policies
CREATE POLICY "Public read for allowed_admins" ON public.allowed_admins FOR SELECT TO public USING (true);
CREATE POLICY "Owners manage allowed_admins" ON public.allowed_admins FOR ALL TO public -- Using public to allow rescue owner with JWT check
USING (
    (auth.jwt()->>'email' = 'ricorrenza.theiqcityfestival@gmail.com')
    OR (is_owner())
);

-- Force reload schema again
NOTIFY pgrst, 'reload schema';
