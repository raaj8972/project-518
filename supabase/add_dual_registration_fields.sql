-- Add dual registration and limit fields to sports_seasons table

ALTER TABLE public.sports_seasons
ADD COLUMN IF NOT EXISTS owner_registration_open BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS player_registration_open BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS max_owners INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_players INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS owner_fee INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS player_fee INTEGER DEFAULT 0;

-- Optional: If you want to migrate the old generic 'registration_open' to the new ones
-- UPDATE public.sports_seasons 
-- SET player_registration_open = registration_open 
-- WHERE registration_open = true;

-- Notice: The original 'registration_open' column can be kept for backward compatibility
-- or dropped later if no longer needed. We'll leave it for now to avoid breaking anything immediately.
