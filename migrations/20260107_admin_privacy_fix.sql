-- Migration to tighten Admin Privacy and ensure Owner Invisibility
-- Restricts SELECT access so admins only see themselves, while the Owner sees everyone.

BEGIN;

-- 1. Tighten admin_users visibility
DROP POLICY IF EXISTS admin_users_select_all ON public.admin_users;

CREATE POLICY "admin_users_select_privacy" ON public.admin_users
FOR SELECT TO authenticated
USING (
    user_id = auth.uid() 
    OR 
    public.is_owner()
);

-- 2. Tighten admin_presence visibility (Hides Owner's presence from others)
DROP POLICY IF EXISTS "Admins can view all presence" ON public.admin_presence;

CREATE POLICY "admin_presence_select_privacy" ON public.admin_presence
FOR SELECT TO authenticated
USING (
    user_id = auth.uid() 
    OR 
    public.is_owner()
);

-- Note: "Admins can update own presence" policy remains unchanged 
-- as it already restricts updates to ones own record.

COMMIT;
