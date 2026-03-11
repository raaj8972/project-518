-- Add group_limits to sports_seasons
ALTER TABLE public.sports_seasons 
ADD COLUMN IF NOT EXISTS group_limits jsonb DEFAULT NULL;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
