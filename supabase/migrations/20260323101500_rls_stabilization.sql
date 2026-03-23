-- Final RLS Stabilization - Anti-Recursion & Strict Owner Management
-- Resolved: Infinite recursion in admin_users policies.
-- Requirement: Only owners can manage admins; admins cannot.

-- 1. Non-Recursive Security Function
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

-- 2. admin_users: Public Read, Owner-Only Management
-- Non-recursive policy: admin_users checks allowed_admins table for roles
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read for admin_users" ON public.admin_users;
CREATE POLICY "Public read for admin_users" ON public.admin_users FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Owners manage admin_users" ON public.admin_users;
CREATE POLICY "Owners manage admin_users" ON public.admin_users FOR ALL TO public
USING (
    (auth.jwt()->>'email' = 'ricorrenza.theiqcityfestival@gmail.com')
    OR (EXISTS (SELECT 1 FROM public.allowed_admins WHERE email = auth.jwt()->>'email' AND role = 'owner'))
);

-- 3. admin_permissions: Public Read, Owner-Only Management
-- Non-recursive policy: admin_permissions checks admin_users table for roles
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read for admin_permissions" ON public.admin_permissions;
CREATE POLICY "Public read for admin_permissions" ON public.admin_permissions FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Owners manage admin_permissions" ON public.admin_permissions;
CREATE POLICY "Owners manage admin_permissions" ON public.admin_permissions FOR ALL TO public
USING (
    (auth.jwt()->>'email' = 'ricorrenza.theiqcityfestival@gmail.com')
    OR (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text AND role = 'owner'))
);

-- 4. allowed_admins (Whitelist): Public Read, Owner-Only Management
ALTER TABLE public.allowed_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read for allowed_admins" ON public.allowed_admins;
CREATE POLICY "Public read for allowed_admins" ON public.allowed_admins FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Owners manage allowed_admins" ON public.allowed_admins;
CREATE POLICY "Owners manage allowed_admins" ON public.allowed_admins FOR ALL TO public
USING (
    (auth.jwt()->>'email' = 'ricorrenza.theiqcityfestival@gmail.com')
    OR (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text AND role = 'owner'))
);

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
