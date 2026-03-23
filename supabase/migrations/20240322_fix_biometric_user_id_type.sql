-- Migration: Fix UUID type mismatch for Firebase User IDs
-- Resolves "invalid input syntax for type uuid" when saving biometric profiles or sessions.

-- 1. Fix biometric_profiles
DO $$ 
BEGIN
    -- Drop FK if exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'biometric_profiles_user_id_fkey') THEN
        ALTER TABLE biometric_profiles DROP CONSTRAINT biometric_profiles_user_id_fkey;
    END IF;
END $$;

ALTER TABLE biometric_profiles ALTER COLUMN user_id TYPE TEXT;

-- Recreate RLS Policies for biometric_profiles to use (auth.jwt() ->> 'sub')
DROP POLICY IF EXISTS "admin_own_biometric_select" ON biometric_profiles;
DROP POLICY IF EXISTS "admin_own_biometric_insert" ON biometric_profiles;
DROP POLICY IF EXISTS "admin_own_biometric_update" ON biometric_profiles;
DROP POLICY IF EXISTS "admin_own_biometric_delete" ON biometric_profiles;

CREATE POLICY "admin_own_biometric_select" ON biometric_profiles FOR SELECT USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "admin_own_biometric_insert" ON biometric_profiles FOR INSERT WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "admin_own_biometric_update" ON biometric_profiles FOR UPDATE USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "admin_own_biometric_delete" ON biometric_profiles FOR DELETE USING ((auth.jwt() ->> 'sub') = user_id);

-- 2. Fix admin_sessions
DO $$ 
BEGIN
    -- Drop FK if exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'admin_sessions_user_id_fkey') THEN
        ALTER TABLE admin_sessions DROP CONSTRAINT admin_sessions_user_id_fkey;
    END IF;
END $$;

ALTER TABLE admin_sessions ALTER COLUMN user_id TYPE TEXT;

-- Recreate RLS Policies for admin_sessions to use (auth.jwt() ->> 'sub')
DROP POLICY IF EXISTS "Admins can view all sessions" ON admin_sessions;
DROP POLICY IF EXISTS "Users can manage their own sessions" ON admin_sessions;

CREATE POLICY "Admins can view all sessions" ON admin_sessions FOR SELECT 
USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = (auth.jwt() ->> 'sub')));

CREATE POLICY "Users can manage their own sessions" ON admin_sessions FOR ALL 
USING (user_id = (auth.jwt() ->> 'sub')) 
WITH CHECK (user_id = (auth.jwt() ->> 'sub'));

-- 3. Fix admin_users RLS if needed (using JWT sub)
-- Note: admin_users typically identifies admins by user_id column being a text UID.
DROP POLICY IF EXISTS "Enable read access for all admins" ON admin_users;
CREATE POLICY "Enable read access for all admins" 
ON admin_users FOR SELECT 
USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = (auth.jwt() ->> 'sub')));
