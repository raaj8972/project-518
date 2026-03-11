-- Add photo_url and metadata columns to sports_registrations table
ALTER TABLE public.sports_registrations
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
