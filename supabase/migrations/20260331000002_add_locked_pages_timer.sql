-- Add support for per-page maintenance timers
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS locked_pages_until jsonb DEFAULT '{}'::jsonb;

-- Ensure RLS includes this new column for the existing policies
-- (Already covered by using 'USING (true)' and 'WITH CHECK (true)' in our previous migration, 
-- but this comment serves as a reminder).
