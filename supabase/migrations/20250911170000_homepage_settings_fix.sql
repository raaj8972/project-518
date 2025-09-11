-- Consolidated fix for homepage_settings realtime + columns + policies (idempotent)
-- Safe to re-run.

-- 1. Ensure table exists with minimal primary key
CREATE TABLE IF NOT EXISTS public.homepage_settings (
  id integer PRIMARY KEY
);

-- 2. Ensure all required columns exist with defaults
ALTER TABLE public.homepage_settings
  ADD COLUMN IF NOT EXISTS hero_media_url text,
  ADD COLUMN IF NOT EXISTS hero_media_type text NOT NULL DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS hero_title text NOT NULL DEFAULT 'RICORRENZA',
  ADD COLUMN IF NOT EXISTS hero_subtitle text NOT NULL DEFAULT 'Experience the Future',
  ADD COLUMN IF NOT EXISTS hero_description text NOT NULL DEFAULT 'Experience the future of Healthcare, Technology, and Creativity',
  ADD COLUMN IF NOT EXISTS sponsor_logos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sponsor_section_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sponsor_section_text text NOT NULL DEFAULT 'Powered by',
  ADD COLUMN IF NOT EXISTS featured_partners_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_faculty_heads boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_committee_heads boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS partners_carousel_speed_ms integer NOT NULL DEFAULT 3000,
  ADD COLUMN IF NOT EXISTS leadership_carousel_speed_ms integer NOT NULL DEFAULT 2500,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 3. Maintain updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_homepage_settings_updated_at ON public.homepage_settings;
CREATE TRIGGER trg_homepage_settings_updated_at
BEFORE UPDATE ON public.homepage_settings
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- 4. Ensure singleton row exists
INSERT INTO public.homepage_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- 5. Enable RLS
ALTER TABLE public.homepage_settings ENABLE ROW LEVEL SECURITY;

-- 6. Idempotent policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='homepage_settings_select' AND tablename='homepage_settings'
  ) THEN
    CREATE POLICY homepage_settings_select
      ON public.homepage_settings FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='homepage_settings_modify' AND tablename='homepage_settings'
  ) THEN
    CREATE POLICY homepage_settings_modify
      ON public.homepage_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 7. Add to realtime publication (ignore error if already added)
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.homepage_settings';
  EXCEPTION WHEN others THEN
    -- ignore if already in publication
    NULL;
  END;
END $$;

-- 8. Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

-- 9. Verification queries (uncomment to run manually)
-- SELECT column_name FROM information_schema.columns WHERE table_name='homepage_settings' ORDER BY column_name;
-- SELECT * FROM public.homepage_settings WHERE id=1;
