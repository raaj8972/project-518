-- MASTER RESTORATION SCRIPT
-- Consolidates missing table schemas for RICORRENZA Supabase DB
-- Date: 2026-03-05

BEGIN;

-- 1. ADMIN USERS
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  role TEXT DEFAULT 'admin', -- 'owner' or 'admin'
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read admin users" ON public.admin_users;
CREATE POLICY "Read admin users" ON public.admin_users FOR SELECT TO authenticated USING (true);

-- 2. ADMIN PERMISSIONS
CREATE TABLE IF NOT EXISTS public.admin_permissions (
  user_id UUID PRIMARY KEY REFERENCES public.admin_users(user_id) on delete cascade,
  can_events BOOLEAN NOT NULL DEFAULT false,
  can_schedule BOOLEAN NOT NULL DEFAULT false,
  can_gallery BOOLEAN NOT NULL DEFAULT false,
  can_sponsors BOOLEAN NOT NULL DEFAULT false,
  can_registrations BOOLEAN NOT NULL DEFAULT false,
  can_registration_photos BOOLEAN NOT NULL DEFAULT false,
  can_faculty BOOLEAN NOT NULL DEFAULT false,
  can_core_team BOOLEAN NOT NULL DEFAULT false,
  can_sports BOOLEAN NOT NULL DEFAULT false,
  can_guest_artists BOOLEAN NOT NULL DEFAULT false,
  can_chief_guests BOOLEAN NOT NULL DEFAULT false,
  can_homebound BOOLEAN NOT NULL DEFAULT false,
  can_security_passes BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- 3. SITE SETTINGS (Singleton)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  site_closed BOOLEAN NOT NULL DEFAULT false,
  coming_soon_enabled BOOLEAN NOT NULL DEFAULT false,
  coming_soon_until TIMESTAMPTZ NULL,
  coming_soon_title TEXT NULL,
  coming_soon_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS site_settings_select ON public.site_settings;
CREATE POLICY site_settings_select ON public.site_settings FOR SELECT USING (true);

-- 4. ABOUT SETTINGS (Singleton)
CREATE TABLE IF NOT EXISTS public.about_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT true,
  hero_title TEXT,
  hero_heading TEXT,
  hero_paragraphs JSONB NOT NULL DEFAULT '[]'::jsonb,
  tracks JSONB NOT NULL DEFAULT '[]'::jsonb,
  zones JSONB NOT NULL DEFAULT '[]'::jsonb,
  stats JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);
INSERT INTO public.about_settings (id, hero_title, hero_heading) 
VALUES (1, 'ABOUT RICORRENZA', 'THE FUTURE IS NOW') 
ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.about_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS about_settings_select ON public.about_settings;
CREATE POLICY about_settings_select ON public.about_settings FOR SELECT USING (true);

-- 5. HOMEBOUND SETTINGS (Singleton)
CREATE TABLE IF NOT EXISTS public.homebound_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  instagram_url TEXT,
  instagram_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);
INSERT INTO public.homebound_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.homebound_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_select_homebound_settings ON public.homebound_settings;
CREATE POLICY anon_select_homebound_settings ON public.homebound_settings FOR SELECT USING (true);

-- 6. SECURITY SETTINGS (Singleton)
CREATE TABLE IF NOT EXISTS public.security_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  entry_pass_button_enabled BOOLEAN DEFAULT true,
  event_dates JSONB DEFAULT '[]'::jsonb,
  councils_enabled BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);
INSERT INTO public.security_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read security settings" ON public.security_settings;
CREATE POLICY "Public read security settings" ON public.security_settings FOR SELECT USING (true);

-- 7. HERO MEDIA
CREATE TABLE IF NOT EXISTS public.hero_media (
  id BIGSERIAL PRIMARY KEY,
  page_key TEXT NOT NULL UNIQUE CHECK (page_key IN ('home','events','schedule','gallery','homebound','ricofamily','sponsors')),
  background_type TEXT NOT NULL DEFAULT 'auto' CHECK (background_type IN ('image','video','auto')),
  image_url TEXT,
  video_url TEXT,
  poster_url TEXT,
  overlay_color TEXT DEFAULT '#000000',
  overlay_opacity NUMERIC NOT NULL DEFAULT 0.35 CHECK (overlay_opacity >= 0 AND overlay_opacity <= 1),
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.hero_media (page_key) VALUES ('home'),('events'),('schedule'),('gallery'),('homebound'),('ricofamily'),('sponsors') ON CONFLICT (page_key) DO NOTHING;
ALTER TABLE public.hero_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hero_media_read_all" ON public.hero_media;
CREATE POLICY "hero_media_read_all" ON public.hero_media FOR SELECT USING (true);

-- 8. EVENT COORDINATORS
CREATE TABLE IF NOT EXISTS public.event_coordinators (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  order_position INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.event_coordinators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "event_coordinators_public_select" ON public.event_coordinators;
CREATE POLICY "event_coordinators_public_select" ON public.event_coordinators FOR SELECT USING (true);

-- 9. ROADMAP MILESTONES
CREATE TABLE IF NOT EXISTS public.roadmap_milestones (
  id BIGSERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  title TEXT,
  points TEXT[] DEFAULT '{}',
  order_position INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  side TEXT NOT NULL DEFAULT 'auto' CHECK (side IN ('auto','left','right')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.roadmap_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS roadmap_milestones_select ON public.roadmap_milestones;
CREATE POLICY roadmap_milestones_select ON public.roadmap_milestones FOR SELECT USING (true);

-- 10. EVENT WINNERS
CREATE TABLE IF NOT EXISTS public.event_winners (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id BIGINT REFERENCES public.events(id) ON DELETE CASCADE,
  registration_id TEXT REFERENCES public.registrations(id) ON DELETE SET NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  name TEXT NOT NULL,
  category TEXT,
  year TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.event_winners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Current winners are viewable by everyone" ON public.event_winners;
CREATE POLICY "Current winners are viewable by everyone" ON public.event_winners FOR SELECT USING (true);

-- 11. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  link_url TEXT NULL,
  visible BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read active notifications" ON public.notifications;
CREATE POLICY "Public can read active notifications" ON public.notifications FOR SELECT USING (visible = true AND starts_at <= now() AND (ends_at IS NULL OR ends_at >= now()));

-- 12. SPORTS COMMITTEES
CREATE TABLE IF NOT EXISTS public.sports_committees (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#22D3EE',
  order_position INTEGER NOT NULL DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sports_committees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sports_committees_select_enabled ON public.sports_committees;
CREATE POLICY sports_committees_select_enabled ON public.sports_committees FOR SELECT USING (enabled);

-- 13. SPORTS TEAM MEMBERS
CREATE TABLE IF NOT EXISTS public.sports_team_members (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  committee_id BIGINT REFERENCES public.sports_committees(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  achievements JSONB NOT NULL DEFAULT '[]'::jsonb,
  order_position INTEGER NOT NULL DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT true,
  is_head BOOLEAN NOT NULL DEFAULT false,
  phone TEXT NULL,
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sports_team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sports_team_members_select_enabled ON public.sports_team_members;
CREATE POLICY sports_team_members_select_enabled ON public.sports_team_members FOR SELECT USING (enabled AND EXISTS (SELECT 1 FROM public.sports_committees c WHERE c.id = committee_id AND c.enabled));

-- 14. VALIDATION RULES
CREATE TABLE IF NOT EXISTS public.validation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  pass_type TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.validation_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read validation rules" ON public.validation_rules;
CREATE POLICY "Public read validation rules" ON public.validation_rules FOR SELECT USING (true);

-- RELOAD API CACHE
NOTIFY pgrst, 'reload schema';

COMMIT;
