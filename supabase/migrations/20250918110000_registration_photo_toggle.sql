-- Add per-event toggle to require participant photo during registration
ALTER TABLE IF EXISTS public.events
  ADD COLUMN IF NOT EXISTS registration_photo_required boolean DEFAULT false;

-- Add photo URL field to registrations to store uploaded participant photo (leader for teams)
ALTER TABLE IF EXISTS public.registrations
  ADD COLUMN IF NOT EXISTS photo_url text;

-- Note: Ensure Supabase Storage bucket used for public registrations allows anon insert if uploads are from public UI.
-- We currently reuse the 'documents' bucket with path prefix 'registrations/'.
