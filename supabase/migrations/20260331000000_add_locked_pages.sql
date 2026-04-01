ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS locked_pages jsonb DEFAULT '{}'::jsonb;
