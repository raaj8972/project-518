-- Add homepage carousel controls and visibility toggles (idempotent)
DO $$
BEGIN
  -- partners (featured sponsors) section toggle
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'homepage_settings' AND column_name = 'featured_partners_enabled'
  ) THEN
    ALTER TABLE public.homepage_settings
      ADD COLUMN featured_partners_enabled boolean NOT NULL DEFAULT true;
  END IF;

  -- leadership section toggles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'homepage_settings' AND column_name = 'show_faculty_heads'
  ) THEN
    ALTER TABLE public.homepage_settings
      ADD COLUMN show_faculty_heads boolean NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'homepage_settings' AND column_name = 'show_committee_heads'
  ) THEN
    ALTER TABLE public.homepage_settings
      ADD COLUMN show_committee_heads boolean NOT NULL DEFAULT true;
  END IF;

  -- carousel speeds (in milliseconds)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'homepage_settings' AND column_name = 'partners_carousel_speed_ms'
  ) THEN
    ALTER TABLE public.homepage_settings
      ADD COLUMN partners_carousel_speed_ms integer NOT NULL DEFAULT 3000;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'homepage_settings' AND column_name = 'leadership_carousel_speed_ms'
  ) THEN
    ALTER TABLE public.homepage_settings
      ADD COLUMN leadership_carousel_speed_ms integer NOT NULL DEFAULT 2500;
  END IF;

  -- Ensure singleton row exists
  INSERT INTO public.homepage_settings (id)
  VALUES (1)
  ON CONFLICT (id) DO NOTHING;
END $$;
