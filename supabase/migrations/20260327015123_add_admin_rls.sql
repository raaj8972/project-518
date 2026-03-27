-- Allow existing admins and owners to manage the allowed_admins whitelist
DROP POLICY IF EXISTS "Admins can manage allowed admins" ON "public"."allowed_admins";
CREATE POLICY "Admins can manage allowed admins" 
ON "public"."allowed_admins" 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE admin_users.user_id = (auth.uid())::text 
        AND admin_users.role IN ('owner', 'admin')
    )
);

-- Check if we need an INSERT policy for admin_users if it was missing 
-- (AuthContext uses dualUpsert to create the profile upon first login)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admin_users' AND policyname = 'Users can insert their own admin profile'
    ) THEN
        CREATE POLICY "Users can insert their own admin profile" 
        ON "public"."admin_users" 
        FOR INSERT WITH CHECK (
            ("auth"."uid"())::"text" = "user_id"
        );
    END IF;
END $$;
