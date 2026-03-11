-- Add metadata to sports_registrations
ALTER TABLE public.sports_registrations
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
