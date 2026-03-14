-- SQL Fix: Update Passkeys and Challenges to support Firebase UIDs and Email
-- Run this in your Supabase SQL Editor

-- 1. Modify passkey_challenges table
ALTER TABLE public.passkey_challenges 
DROP CONSTRAINT IF EXISTS passkey_challenges_user_id_fkey;

ALTER TABLE public.passkey_challenges 
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE public.passkey_challenges 
ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Modify passkeys table
ALTER TABLE public.passkeys 
DROP CONSTRAINT IF EXISTS passkeys_user_id_fkey;

ALTER TABLE public.passkeys 
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE public.passkeys 
ADD COLUMN IF NOT EXISTS email TEXT;

-- 3. Update existing admin_users mapping check (Ensuring compatibility)
-- If admin_users used UUID but stores Firebase UIDs, we should fix that too
-- Assuming it's already TEXT based on other successful queries
-- ALTER TABLE public.admin_users ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Refresh schema cache
ANALYZE public.passkeys;
ANALYZE public.passkey_challenges;
