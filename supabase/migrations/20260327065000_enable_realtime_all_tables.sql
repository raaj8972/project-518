-- ============================================================
-- Enable Supabase Realtime for all app tables
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Step 1: Add all tables to the realtime publication
-- (This is what makes Supabase broadcast changes to subscribers)
DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'events', 'event_categories', 'event_coordinators',
    'schedule_days', 'schedule_events', 'event_winners',
    'notifications', 'roadmap_milestones',
    'sponsors', 'sponsorship_packages', 'sponsorship_settings',
    'registrations', 'auditions', 'memberships',
    'admin_users', 'admin_permissions',
    'faculty_heads', 'core_committees', 'core_team_members',
    'sports_committees', 'sports_team_members',
    'band_members', 'guest_artists', 'chief_guests',
    'announcements', 'chat_messages', 'site_settings'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
      RAISE NOTICE 'Added % to realtime publication', t;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped % (already in publication or does not exist): %', t, SQLERRM;
    END;
  END LOOP;
END $$;

-- Step 2: Set REPLICA IDENTITY FULL so UPDATE and DELETE events
-- include the full old row (needed for some realtime use cases)
DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'events', 'event_categories', 'event_coordinators',
    'schedule_days', 'schedule_events', 'event_winners',
    'notifications', 'roadmap_milestones',
    'sponsors', 'sponsorship_packages', 'sponsorship_settings',
    'registrations', 'auditions', 'memberships',
    'admin_users', 'admin_permissions',
    'faculty_heads', 'core_committees', 'core_team_members',
    'sports_committees', 'sports_team_members',
    'band_members', 'guest_artists', 'chief_guests',
    'announcements', 'chat_messages', 'site_settings'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I REPLICA IDENTITY FULL', t);
      RAISE NOTICE 'Set REPLICA IDENTITY FULL on %', t;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped REPLICA IDENTITY on % : %', t, SQLERRM;
    END;
  END LOOP;
END $$;
