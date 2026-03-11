-- Add annual_sports_mode_enabled to site_settings
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS annual_sports_mode_enabled boolean not null default false;

-- Ensure PostgREST schema cache reloads
DO $$ BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION WHEN others THEN NULL; END $$;
