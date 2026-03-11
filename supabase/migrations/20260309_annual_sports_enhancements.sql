-- Add registration_limit, custom_fields, and group_limits to annual_sports_events
ALTER TABLE public.annual_sports_events 
ADD COLUMN IF NOT EXISTS registration_limit integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS group_limits jsonb DEFAULT NULL;

-- Add metadata to annual_sports_registrations
ALTER TABLE public.annual_sports_registrations
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
