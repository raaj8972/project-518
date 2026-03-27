-- Add missing RLS policies for biometric_profiles
-- These were likely missed during the baseline dump or were intended but not present in production

CREATE POLICY "admin_own_biometric_select" ON "public"."biometric_profiles"
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "admin_own_biometric_insert" ON "public"."biometric_profiles"
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_own_biometric_update" ON "public"."biometric_profiles"
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "admin_own_biometric_delete" ON "public"."biometric_profiles"
FOR DELETE USING (auth.uid() = user_id);
