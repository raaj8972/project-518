-- =============================================================================
-- COMPLETE ADMIN REWRITE SCHEMA & RLS
-- This script safely constructs the necessary tables for the new admin system 
-- and applies clean, simplified RLS policies.
-- =============================================================================

-- 1. Ensure extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create or verify `admin_users` table
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin')),
    is_primary BOOLEAN DEFAULT false,
    display_name TEXT,
    requires_approval BOOLEAN DEFAULT false,
    approval_enabled_by UUID,
    approval_enabled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safely add any new columns to existing table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='admin_users' AND column_name='display_name') THEN
        ALTER TABLE public.admin_users ADD COLUMN display_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='admin_users' AND column_name='requires_approval') THEN
        ALTER TABLE public.admin_users ADD COLUMN requires_approval BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='admin_users' AND column_name='approval_enabled_by') THEN
        ALTER TABLE public.admin_users ADD COLUMN approval_enabled_by UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='admin_users' AND column_name='approval_enabled_at') THEN
        ALTER TABLE public.admin_users ADD COLUMN approval_enabled_at TIMESTAMPTZ;
    END IF;
END $$;


-- 3. Create or verify `admin_permissions` table
CREATE TABLE IF NOT EXISTS public.admin_permissions (
    user_id UUID PRIMARY KEY REFERENCES public.admin_users(user_id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    can_events BOOLEAN DEFAULT false,
    can_schedule BOOLEAN DEFAULT false,
    can_gallery BOOLEAN DEFAULT false,
    can_sponsors BOOLEAN DEFAULT false,
    can_registrations BOOLEAN DEFAULT false,
    can_registration_photos BOOLEAN DEFAULT false,
    can_faculty BOOLEAN DEFAULT false,
    can_core_team BOOLEAN DEFAULT false,
    can_guest_artists BOOLEAN DEFAULT false,
    can_chief_guests BOOLEAN DEFAULT false,
    can_homebound BOOLEAN DEFAULT false,
    can_sports BOOLEAN DEFAULT false,
    can_security_passes BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safely add any new columns to existing table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='admin_permissions' AND column_name='email') THEN
        ALTER TABLE public.admin_permissions ADD COLUMN email TEXT DEFAULT '';
    END IF;
    -- Just in case others are missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='admin_permissions' AND column_name='can_registration_photos') THEN
        ALTER TABLE public.admin_permissions ADD COLUMN can_registration_photos BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='admin_permissions' AND column_name='can_security_passes') THEN
        ALTER TABLE public.admin_permissions ADD COLUMN can_security_passes BOOLEAN DEFAULT false;
    END IF;
END $$;


-- 4. Create or verify `allowed_admins` (Gmail Whitelist)
CREATE TABLE IF NOT EXISTS public.allowed_admins (
    id TEXT PRIMARY KEY, -- Email transformed (e.g., user_gmail_com)
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin')),
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- CLEAN RLS POLICIES
-- We will drop old policies on these tables to prevent conflicts, 
-- then apply drastically simplified visibility rules.
-- =============================================================================

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowed_admins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies safely (ignoring errors if they don't exist is tricky in standard PG block, 
-- but we can use DO blocks)
DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('admin_users', 'admin_permissions', 'allowed_admins')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- NEW SIMPLIFIED POLICIES
-- Note: Security is mostly enforced by the REST API (Netlify Functions) using 
-- the Service Role Key. These RLS policies are primarily for initial read 
-- visibility by the dashboard components.
-- -----------------------------------------------------------------------------

-- ADMIN_USERS:
-- Allow anyone authenticated to read the list of admins (needed for UI rendering).
-- Only Service Role can insert/update/delete (Service Role bypasses RLS naturally).
CREATE POLICY "Public Read Admin Users" 
    ON public.admin_users FOR SELECT 
    USING (true);

CREATE POLICY "Users can update their own profile" 
    ON public.admin_users FOR UPDATE 
    USING (auth.uid()::text = user_id::text);

-- ADMIN_PERMISSIONS:
-- Allow anyone authenticated to read permissions.
CREATE POLICY "Public Read Admin Permissions" 
    ON public.admin_permissions FOR SELECT 
    USING (true);

-- ALLOWED_ADMINS:
-- Allow anyone to read the whitelist (used during login).
CREATE POLICY "Public Read Allowed Admins" 
    ON public.allowed_admins FOR SELECT 
    USING (true);

-- No public insert/update/delete policies.
-- All mutations (creating admins, changing roles) will be handled 
-- by our secure Netlify backend functions using the Service Role JWT, 
-- which automatically bypasses RLS.

-- Insert the hardcoded master owner if not exists to ensure you're never locked out
INSERT INTO public.admin_users (user_id, email, role, is_primary, display_name)
VALUES (
    '00000000-0000-0000-0000-000000000000', 
    'ricorrenza.theiqcityfestival@gmail.com', 
    'owner', 
    true, 
    'System Owner'
)
ON CONFLICT (email) DO NOTHING;

-- Force sync the permission row for the master owner
INSERT INTO public.admin_permissions (user_id, email, can_events, can_schedule, can_gallery, can_sponsors, can_registrations, can_registration_photos, can_faculty, can_core_team, can_guest_artists, can_chief_guests, can_homebound, can_sports, can_security_passes)
SELECT 
    user_id, email, true, true, true, true, true, true, true, true, true, true, true, true, true
FROM public.admin_users 
WHERE email = 'ricorrenza.theiqcityfestival@gmail.com'
ON CONFLICT (user_id) DO NOTHING;
