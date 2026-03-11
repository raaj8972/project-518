-- Copy and paste this script into your Supabase Dashboard -> SQL Editor -> New Query
-- Click "RUN" to execute it. This will safely add all missing columns to the events table.

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS motion_poster_url text,
ADD COLUMN IF NOT EXISTS motion_poster_autoplay boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS watch_live_url text,
ADD COLUMN IF NOT EXISTS prefer_video boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS rules_link text,
ADD COLUMN IF NOT EXISTS owner_hover_reveal boolean DEFAULT false,

ADD COLUMN IF NOT EXISTS coordinator_name text,
ADD COLUMN IF NOT EXISTS coordinator_phone text,
ADD COLUMN IF NOT EXISTS coordinator_password text,
ADD COLUMN IF NOT EXISTS whatsapp_group_link text,

ADD COLUMN IF NOT EXISTS registration_timer_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS registration_opens_at timestamptz,
ADD COLUMN IF NOT EXISTS registration_closes_at timestamptz,
ADD COLUMN IF NOT EXISTS registration_photo_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS registration_photo_label text,
ADD COLUMN IF NOT EXISTS registration_form_fields jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS registration_participant_types text[],
ADD COLUMN IF NOT EXISTS registration_participant_quotas jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS registration_default_mode text DEFAULT 'individual',
ADD COLUMN IF NOT EXISTS registration_mode_locked boolean DEFAULT false,

ADD COLUMN IF NOT EXISTS team_max_members integer,
ADD COLUMN IF NOT EXISTS team_min_members integer,
ADD COLUMN IF NOT EXISTS team_required_size integer;

-- Optional: Since we removed NOT NULL from date/time/venue locally, let's remove it remotely too
ALTER TABLE public.events ALTER COLUMN date DROP NOT NULL;
ALTER TABLE public.events ALTER COLUMN time DROP NOT NULL;
ALTER TABLE public.events ALTER COLUMN venue DROP NOT NULL;
