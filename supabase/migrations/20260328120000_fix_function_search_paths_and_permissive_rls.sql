-- =============================================================
-- Security Fixes (2026-03-28) - Part 2
-- 1. Pin search_path for ALL public schema functions
--    (prevents search_path injection attacks)
-- 2. Tighten always-true RLS write policies on admin-managed
--    content tables — replaces USING(true)/WITH CHECK(true)
--    with proper admin-role checks.
-- NOTE: vector extension in public schema is intentionally
--    left — moving it requires a full schema rebuild. Track
--    separately.
-- =============================================================

-- ---------------------------------------------------------------
-- PART 1: Fix search_path for all public schema functions
-- ---------------------------------------------------------------
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN
    SELECT
      p.proname AS name,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind IN ('f', 'p', 'a')
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER ROUTINE public.%I(%s) SET search_path = ''''',
        func_record.name,
        func_record.args
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped: public.%(%) — %',
        func_record.name, func_record.args, SQLERRM;
    END;
  END LOOP;
END $$;

-- ---------------------------------------------------------------
-- PART 2: Replace always-true write policies with admin checks
-- Strategy: drop old permissive policies, create admin-only ones.
-- Public READ policies (USING true for SELECT) are untouched.
-- Intentionally-public INSERT tables (registrations, sports_reg,
-- pass_registrations, pass_scans) are also left unchanged.
-- ---------------------------------------------------------------

-- Helper: admin check expression (used inline in every policy)
-- EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text AND role IN ('admin','owner'))

-- ---------------------------------------------------------------
-- auditions
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to delete auditions" ON public.auditions;
DROP POLICY IF EXISTS "Allow authenticated users to update auditions" ON public.auditions;
CREATE POLICY "auditions_admin_write" ON public.auditions
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- band_members
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.band_members;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.band_members;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.band_members;
CREATE POLICY "band_members_admin_write" ON public.band_members
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- chief_guests
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "chief_guests_all_auth" ON public.chief_guests;
DROP POLICY IF EXISTS "chief_guests_delete" ON public.chief_guests;
DROP POLICY IF EXISTS "chief_guests_insert" ON public.chief_guests;
DROP POLICY IF EXISTS "chief_guests_update" ON public.chief_guests;
CREATE POLICY "chief_guests_admin_write" ON public.chief_guests
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- contact_sections
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to delete contact_sections" ON public.contact_sections;
DROP POLICY IF EXISTS "Allow authenticated users to insert contact_sections" ON public.contact_sections;
DROP POLICY IF EXISTS "Allow authenticated users to update contact_sections" ON public.contact_sections;
CREATE POLICY "contact_sections_admin_write" ON public.contact_sections
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- core_committees
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to delete core_committees" ON public.core_committees;
DROP POLICY IF EXISTS "Allow authenticated users to insert core_committees" ON public.core_committees;
DROP POLICY IF EXISTS "Allow authenticated users to update core_committees" ON public.core_committees;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.core_committees;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.core_committees;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.core_committees;
CREATE POLICY "core_committees_admin_write" ON public.core_committees
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- core_team_members
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to delete core_team_members" ON public.core_team_members;
DROP POLICY IF EXISTS "Allow authenticated users to insert core_team_members" ON public.core_team_members;
DROP POLICY IF EXISTS "Allow authenticated users to update core_team_members" ON public.core_team_members;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.core_team_members;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.core_team_members;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.core_team_members;
CREATE POLICY "core_team_members_admin_write" ON public.core_team_members
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- event_categories
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to delete event_categories" ON public.event_categories;
DROP POLICY IF EXISTS "Allow authenticated users to insert event_categories" ON public.event_categories;
DROP POLICY IF EXISTS "Allow authenticated users to update event_categories" ON public.event_categories;
CREATE POLICY "event_categories_admin_write" ON public.event_categories
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- event_coordinators
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to manage event_coordinators" ON public.event_coordinators;
CREATE POLICY "event_coordinators_admin_write" ON public.event_coordinators
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- events
-- NOTE: "Allow anon to update event status" is kept intentionally
--       for payment gateway webhook callbacks.
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to delete events" ON public.events;
DROP POLICY IF EXISTS "Allow authenticated users to insert events" ON public.events;
DROP POLICY IF EXISTS "Allow authenticated users to update events" ON public.events;
CREATE POLICY "events_admin_write" ON public.events
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- faculty_heads
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to delete faculty_heads" ON public.faculty_heads;
DROP POLICY IF EXISTS "Allow authenticated users to insert faculty_heads" ON public.faculty_heads;
DROP POLICY IF EXISTS "Allow authenticated users to update faculty_heads" ON public.faculty_heads;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.faculty_heads;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.faculty_heads;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.faculty_heads;
CREATE POLICY "faculty_heads_admin_write" ON public.faculty_heads
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- form_settings
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to update form_settings" ON public.form_settings;
CREATE POLICY "form_settings_admin_update" ON public.form_settings
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- gallery_images
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to delete gallery_images" ON public.gallery_images;
DROP POLICY IF EXISTS "Allow authenticated users to insert gallery_images" ON public.gallery_images;
DROP POLICY IF EXISTS "Allow authenticated users to update gallery_images" ON public.gallery_images;
CREATE POLICY "gallery_images_admin_write" ON public.gallery_images
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- gallery_settings
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "gallery_settings_update_auth" ON public.gallery_settings;
CREATE POLICY "gallery_settings_admin_update" ON public.gallery_settings
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- guest_artists
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.guest_artists;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.guest_artists;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.guest_artists;
CREATE POLICY "guest_artists_admin_write" ON public.guest_artists
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- hero_media
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "hero_media_modify_auth" ON public.hero_media;
CREATE POLICY "hero_media_admin_write" ON public.hero_media
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- homebound_settings
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "auth_manage_homebound_settings" ON public.homebound_settings;
CREATE POLICY "homebound_settings_admin_write" ON public.homebound_settings
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- homepage_settings
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to insert homepage_settings" ON public.homepage_settings;
DROP POLICY IF EXISTS "Allow authenticated users to update homepage_settings" ON public.homepage_settings;
DROP POLICY IF EXISTS "homepage_settings_modify" ON public.homepage_settings;
CREATE POLICY "homepage_settings_admin_write" ON public.homepage_settings
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- memberships
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to delete memberships" ON public.memberships;
DROP POLICY IF EXISTS "Allow authenticated users to update memberships" ON public.memberships;
CREATE POLICY "memberships_admin_write" ON public.memberships
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- schedule_days
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to delete schedule_days" ON public.schedule_days;
DROP POLICY IF EXISTS "Allow authenticated users to insert schedule_days" ON public.schedule_days;
DROP POLICY IF EXISTS "Allow authenticated users to update schedule_days" ON public.schedule_days;
CREATE POLICY "schedule_days_admin_write" ON public.schedule_days
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- schedule_events
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to delete schedule_events" ON public.schedule_events;
DROP POLICY IF EXISTS "Allow authenticated users to insert schedule_events" ON public.schedule_events;
DROP POLICY IF EXISTS "Allow authenticated users to update schedule_events" ON public.schedule_events;
CREATE POLICY "schedule_events_admin_write" ON public.schedule_events
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- social_media_settings
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to delete social_media_settings" ON public.social_media_settings;
DROP POLICY IF EXISTS "Allow authenticated users to insert social_media_settings" ON public.social_media_settings;
DROP POLICY IF EXISTS "Allow authenticated users to update social_media_settings" ON public.social_media_settings;
CREATE POLICY "social_media_settings_admin_write" ON public.social_media_settings
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- sponsors
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to delete sponsors" ON public.sponsors;
DROP POLICY IF EXISTS "Allow authenticated users to insert sponsors" ON public.sponsors;
DROP POLICY IF EXISTS "Allow authenticated users to update sponsors" ON public.sponsors;
CREATE POLICY "sponsors_admin_write" ON public.sponsors
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- sponsorship_packages
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to delete sponsorship_packages" ON public.sponsorship_packages;
DROP POLICY IF EXISTS "Allow authenticated users to insert sponsorship_packages" ON public.sponsorship_packages;
DROP POLICY IF EXISTS "Allow authenticated users to update sponsorship_packages" ON public.sponsorship_packages;
CREATE POLICY "sponsorship_packages_admin_write" ON public.sponsorship_packages
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- sponsorship_settings
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to delete sponsorship_settings" ON public.sponsorship_settings;
DROP POLICY IF EXISTS "Allow authenticated users to insert sponsorship_settings" ON public.sponsorship_settings;
DROP POLICY IF EXISTS "Allow authenticated users to update sponsorship_settings" ON public.sponsorship_settings;
CREATE POLICY "sponsorship_settings_admin_write" ON public.sponsorship_settings
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- sports_committees
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "sports_committees_auth_rw" ON public.sports_committees;
CREATE POLICY "sports_committees_admin_write" ON public.sports_committees
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- sports_matches (tournament data — admin managed)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public all sports_matches" ON public.sports_matches;
DROP POLICY IF EXISTS "Public sports matches" ON public.sports_matches;
-- Keep public SELECT, restrict writes to admin
CREATE POLICY "sports_matches_admin_write" ON public.sports_matches
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- sports_players
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public all sports_players" ON public.sports_players;
DROP POLICY IF EXISTS "Public sports players" ON public.sports_players;
CREATE POLICY "sports_players_admin_write" ON public.sports_players
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- sports_seasons
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public all sports_seasons" ON public.sports_seasons;
DROP POLICY IF EXISTS "Public sports seasons" ON public.sports_seasons;
CREATE POLICY "sports_seasons_admin_write" ON public.sports_seasons
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- sports_teams
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public all sports_teams" ON public.sports_teams;
DROP POLICY IF EXISTS "Public sports teams" ON public.sports_teams;
CREATE POLICY "sports_teams_admin_write" ON public.sports_teams
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- sports_team_members
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "sports_team_members_auth_rw" ON public.sports_team_members;
CREATE POLICY "sports_team_members_admin_write" ON public.sports_team_members
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- storage_setup_status
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to update storage_setup_status" ON public.storage_setup_status;
CREATE POLICY "storage_setup_status_admin_update" ON public.storage_setup_status
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text AND role IN ('admin','owner')
    )
  );

-- ---------------------------------------------------------------
-- INTENTIONALLY LEFT AS-IS (public registration flows):
--
-- annual_sports_registrations: "Public Insert Registrations"
--   → Students register without an account.
--
-- pass_registrations: "pass_registrations_public_insert"
--   → Public pass registration form.
--
-- pass_scans: "Public insert scans" + "Scanners can insert scans"
--   → Scanner devices may not have auth tokens.
--
-- registrations: "Allow public to create registrations"
--              + "Allow anon to update registration status"
--   → Public event registration + payment gateway callbacks.
--
-- sports_registrations: "Allow public insert to sports_registrations"
--                     + "Allow public sports registration"
--   → Public sports registration forms.
-- ---------------------------------------------------------------
