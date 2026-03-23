-- Add sports_instagram_url to site_settings table
ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS sports_instagram_url TEXT;

-- Retroactive fix for orphaned admin_permissions caused by Firebase UID mismatch
-- This finds the admin_users entry for the sports council email, and updates the admin_permissions 
-- record that still has the old hardcoded ID to match the new Firebase UID.
DO $$
DECLARE
  v_new_uid UUID;
BEGIN
  -- Find the current user_id for sports council in admin_users
  SELECT user_id INTO v_new_uid FROM public.admin_users WHERE email = 'sports.council@rico.family' LIMIT 1;
  
  -- If we found it, and it's not the original hard-coded seed ID, update permissions
  IF v_new_uid IS NOT NULL AND v_new_uid != '86dbc36d-433f-47fd-8fb3-7f7424333605' THEN
    UPDATE public.admin_permissions 
    SET user_id = v_new_uid 
    WHERE user_id = '86dbc36d-433f-47fd-8fb3-7f7424333605';
  END IF;
END $$;

-- Reload cache
SELECT pg_notify('pgrst', 'reload schema');
