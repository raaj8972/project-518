-- 1. Clean up any invalid or empty usernames by setting them to NULL
UPDATE public.profiles
SET username = NULL
WHERE username IS NOT NULL 
  AND (length(trim(username)) < 3 OR username !~ '^[a-zA-Z0-9_]+$');

-- 2. Add a constraint to enforce unique, valid, and non-empty usernames
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_username_format;
ALTER TABLE public.profiles
  ADD CONSTRAINT chk_username_format
  CHECK (username IS NULL OR (length(username) >= 3 AND username ~ '^[a-zA-Z0-9_]+$'));
