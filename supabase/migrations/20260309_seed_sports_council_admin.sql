-- Add sports.council user to admin tables to ensure they have database-level permissions

INSERT INTO public.admin_users (user_id, email, role, is_primary)
VALUES ('86dbc36d-433f-47fd-8fb3-7f7424333605', 'sports.council@rico.family', 'council', false)
ON CONFLICT (user_id) DO UPDATE SET role = 'council';

INSERT INTO public.admin_permissions (
  user_id, 
  can_events, can_schedule, can_gallery, can_sponsors, 
  can_registrations, can_registration_photos, can_faculty, 
  can_core_team, can_sports, can_guest_artists, 
  can_chief_guests, can_homebound, can_security_passes
)
VALUES (
  '86dbc36d-433f-47fd-8fb3-7f7424333605',
  false, false, false, false,
  true, true, false,
  false, true, false,
  false, false, false
)
ON CONFLICT (user_id) DO UPDATE SET 
  can_sports = true,
  can_registrations = true,
  can_registration_photos = true;

-- Reload cache
SELECT pg_notify('pgrst', 'reload schema');
