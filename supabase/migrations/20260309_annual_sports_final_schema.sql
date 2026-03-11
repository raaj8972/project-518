-- Migration to finalize Annual Sports Schema for full customization
-- 20260309_annual_sports_final_schema.sql

-- 1. Enhancing annual_sports_events
ALTER TABLE public.annual_sports_events 
ADD COLUMN IF NOT EXISTS registration_participant_types text[] DEFAULT '{Student, Faculty}',
ADD COLUMN IF NOT EXISTS registration_participant_quotas jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS registration_timer_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS registration_opens_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS registration_closes_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS registration_default_mode text DEFAULT 'individual',
ADD COLUMN IF NOT EXISTS registration_mode_locked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS team_min_members integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS team_max_members integer DEFAULT 11;

-- 2. Enhancing annual_sports_registrations
ALTER TABLE public.annual_sports_registrations
ADD COLUMN IF NOT EXISTS college text,
ADD COLUMN IF NOT EXISTS participant_type text DEFAULT 'Student',
ADD COLUMN IF NOT EXISTS is_team_registration boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS team_name text,
ADD COLUMN IF NOT EXISTS team_members jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS total_members integer DEFAULT 1;

-- 3. Ensure custom_fields exists (from previous partial migration if it failed)
ALTER TABLE public.annual_sports_events 
ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '[]';

-- 4. Ensure metadata exists in registrations
ALTER TABLE public.annual_sports_registrations
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- 5. Reload Schema
NOTIFY pgrst, 'reload schema';
