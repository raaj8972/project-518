-- Definitive SQL Fix: Add missing email columns to passkey tables
-- Run this in your Supabase SQL Editor

ALTER TABLE public.passkey_challenges 
ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE public.passkeys 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Refresh schema cache
ANALYZE public.passkeys;
ANALYZE public.passkey_challenges;
