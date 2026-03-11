-- SCHEMA PATCH 2: Restore missing context tables
-- Date: 2026-03-05

BEGIN;

-- 1. gallery_settings
CREATE TABLE IF NOT EXISTS public.gallery_settings (
  id integer primary key default 1,
  scroll_per_item integer not null default 650,
  distance integer not null default 1400,
  background_blur_px integer not null default 100,
  card_blur_max integer not null default 8,
  reveal_enabled boolean default true,
  reveal_duration_ms integer default 1000,
  reveal_orientation text default 'horizontal',
  updated_at timestamp with time zone default now()
);

INSERT INTO public.gallery_settings (id)
  VALUES (1)
  ON CONFLICT (id) DO NOTHING;

-- 2. chief_guests
CREATE TABLE IF NOT EXISTS public.chief_guests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  title text NOT NULL,
  image text NOT NULL,
  description text NOT NULL,
  specialty text,
  achievements text[] DEFAULT '{}',
  social_links jsonb DEFAULT '{}',
  enabled boolean DEFAULT true,
  is_featured boolean DEFAULT true,
  order_position integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. admin_sessions
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  ip_address text,
  user_agent text,
  last_seen_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Enable RLS and simple policies to allow anon select
ALTER TABLE public.gallery_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chief_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- gallery_settings policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gallery_settings' AND policyname = 'gallery_settings_read_anon'
  ) THEN
    CREATE POLICY gallery_settings_read_anon ON public.gallery_settings FOR SELECT TO anon, authenticated USING (true);
  END IF;
END$$;

-- chief_guests policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chief_guests' AND policyname = 'chief_guests_read_anon'
  ) THEN
    CREATE POLICY chief_guests_read_anon ON public.chief_guests FOR SELECT TO anon, authenticated USING (true);
  END IF;
END$$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
