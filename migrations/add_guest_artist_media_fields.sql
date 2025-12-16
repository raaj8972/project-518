ALTER TABLE public.guest_artists 
ADD COLUMN IF NOT EXISTS card_media_url TEXT,
ADD COLUMN IF NOT EXISTS card_media_mode TEXT DEFAULT 'image';

-- Update RLS policies to allow update of these columns is generally automatic for column additions, 
-- but ensuring the public/authenticated roles have access is good practice if granular permissions exist.
-- (Assuming standard RLS where authenticated users can update rows they have access to)
