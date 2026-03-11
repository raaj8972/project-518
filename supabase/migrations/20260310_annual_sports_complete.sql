-- CLEAN START: Unified Annual Sports Schema (Supabase)
-- This will DROP existing tables to ensure a clean, perfectly synced schema.
-- WARNING: This will clear existing annual sports events and registrations!

-- 1. CLEAN UP
DROP TABLE IF EXISTS public.annual_sports_registrations;
DROP TABLE IF EXISTS public.annual_sports_events;

-- 2. Table: annual_sports_events
CREATE TABLE public.annual_sports_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    category text,
    description text,
    image_url text,
    rules_url text,
    fee numeric DEFAULT 0,
    registration_open boolean DEFAULT true,
    
    -- Participant Configuration
    min_participants integer DEFAULT 1,
    max_participants integer DEFAULT 1,
    registration_limit integer,
    
    -- Sync'd with AnnualRegistrationModalSettings
    registration_participant_types text[] DEFAULT '{Student, Faculty}',
    registration_participant_quotas jsonb DEFAULT '{}',
    registration_default_mode text DEFAULT 'individual',
    registration_mode_locked boolean DEFAULT false,
    
    -- Team Configuration
    team_min_members integer DEFAULT 1,
    team_max_members integer DEFAULT 11,
    
    -- Registration Window
    registration_timer_enabled boolean DEFAULT false,
    registration_opens_at timestamp with time zone,
    registration_closes_at timestamp with time zone,
    
    -- Custom Experience
    custom_fields jsonb DEFAULT '[]',
    
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 3. Table: annual_sports_registrations
CREATE TABLE public.annual_sports_registrations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id uuid REFERENCES public.annual_sports_events(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id),
    
    -- Participant Details
    full_name text,
    email text,
    phone text,
    college text,
    department text,
    year text,
    roll_no text,
    participant_type text DEFAULT 'Student',
    photo_url text,
    
    -- Team Details
    is_team_registration boolean DEFAULT false,
    team_name text,
    team_members jsonb DEFAULT '[]',
    total_members integer DEFAULT 1,
    
    -- Registration Metadata (Custom Fields & Status)
    status text DEFAULT 'pending',
    metadata jsonb DEFAULT '{}',
    
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 4. Security (RLS)
ALTER TABLE public.annual_sports_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_sports_registrations ENABLE ROW LEVEL SECURITY;

-- Policies for Events
DROP POLICY IF EXISTS "Public Read Events" ON public.annual_sports_events;
CREATE POLICY "Public Read Events" ON public.annual_sports_events 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin Manage Events" ON public.annual_sports_events;
CREATE POLICY "Admin Manage Events" ON public.annual_sports_events 
FOR ALL USING (auth.role() = 'authenticated');

-- Policies for Registrations
DROP POLICY IF EXISTS "Public Insert Registrations" ON public.annual_sports_registrations;
CREATE POLICY "Public Insert Registrations" ON public.annual_sports_registrations 
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users Read Own Registrations" ON public.annual_sports_registrations;
CREATE POLICY "Users Read Own Registrations" ON public.annual_sports_registrations 
FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'authenticated');

-- 5. Reload Schema
NOTIFY pgrst, 'reload schema';
