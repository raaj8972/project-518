-- SQL to manually update an admin's email address in both auth.users and public.admin_users
-- Run this in the Supabase SQL Editor

BEGIN;

-- 1. Update the Auth User (System)
-- Replace 'old_email@example.com' and 'new_email@example.com'
UPDATE auth.users 
SET 
  email = 'new_email@example.com',
  email_change = '',
  email_change_token_new = '',
  email_confirmed_at = NOW()
WHERE email = 'old_email@example.com';

-- 2. Update the Admin User Record (Public)
UPDATE public.admin_users 
SET email = 'new_email@example.com' 
WHERE email = 'old_email@example.com';

COMMIT;
