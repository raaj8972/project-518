-- 20260328160000_comprehensive_rls_performance_fix.sql
-- COMPREHENSIVE RLS PERFORMANCE & REDUNDANCY OPTIMIZATION
-- This migration addresses all findings from the Supabase linter report:
-- 1. AUTH_RLS_INIT_PLAN: Wraps auth.uid() and auth.role() in subqueries (SELECT auth.uid()).
-- 2. MULTIPLE_PERMISSIVE_POLICIES: Merges redundant policies for the same role/action.

DO $$ 
DECLARE
    tbl_name TEXT;
    admin_tables TEXT[] := ARRAY[
        'allowed_admins', 'auditions', 'gallery_faces', 'band_members', 'chief_guests', 
        'contact_sections', 'core_committees', 'core_team_members', 'event_categories', 
        'event_coordinators', 'events', 'faculty_heads', 'form_settings', 'gallery_images', 
        'gallery_settings', 'hero_media', 'homebound_settings', 'homepage_settings', 
        'memberships', 'schedule_days', 'schedule_events', 'social_media_settings', 
        'sponsors', 'sponsorship_packages', 'sponsorship_settings', 'sports_committees', 
        'sports_matches', 'sports_players', 'sports_seasons', 'sports_teams', 
        'sports_team_members', 'storage_setup_status'
    ];
BEGIN
    ---------------------------------------------------------------------------
    -- 1. ANNUAL SPORTS MANAGEMENT (PERFORMANCE & MERGING)
    ---------------------------------------------------------------------------
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'annual_sports_matches') THEN
        DROP POLICY IF EXISTS "Admin Full Access" ON public.annual_sports_matches;
        DROP POLICY IF EXISTS "Allow authenticated read" ON public.annual_sports_matches;
        DROP POLICY IF EXISTS "annual_sports_matches_read" ON public.annual_sports_matches;
        DROP POLICY IF EXISTS "annual_sports_matches_admin_all" ON public.annual_sports_matches;

        CREATE POLICY "annual_sports_matches_read" ON public.annual_sports_matches FOR SELECT TO authenticated USING ( true );
        CREATE POLICY "annual_sports_matches_admin_all" ON public.annual_sports_matches FOR ALL TO authenticated 
            USING ( (SELECT auth.role()) = 'authenticated' );
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'annual_sports_events') THEN
        DROP POLICY IF EXISTS "Admin Manage Events" ON public.annual_sports_events;
        DROP POLICY IF EXISTS "annual_sports_events_admin_all" ON public.annual_sports_events;

        CREATE POLICY "annual_sports_events_admin_all" ON public.annual_sports_events FOR ALL TO authenticated 
            USING ( (SELECT auth.role()) = 'authenticated' );
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'annual_sports_registrations') THEN
        DROP POLICY IF EXISTS "Admins Manage Registrations" ON public.annual_sports_registrations;
        DROP POLICY IF EXISTS "annual_sports_registrations_admin_all" ON public.annual_sports_registrations;

        CREATE POLICY "annual_sports_registrations_admin_all" ON public.annual_sports_registrations FOR ALL TO authenticated 
            USING ( (SELECT auth.role()) = 'authenticated' );
    END IF;

    ---------------------------------------------------------------------------
    -- 2. PROFILES & USERS (PERFORMANCE)
    ---------------------------------------------------------------------------
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
        DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
        DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
        DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

        CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK ( (SELECT auth.uid()) = id );
        CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING ( (SELECT auth.uid()) = id );
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_users') THEN
        DROP POLICY IF EXISTS "Owners can update any admin profile" ON public.admin_users;
        DROP POLICY IF EXISTS "Users can update their own profile" ON public.admin_users;
        DROP POLICY IF EXISTS "Users can insert their own admin profile" ON public.admin_users;
        DROP POLICY IF EXISTS "Public Read Admin Users" ON public.admin_users;
        DROP POLICY IF EXISTS "admin_users_read_all" ON public.admin_users;
        DROP POLICY IF EXISTS "admin_users_select" ON public.admin_users;
        DROP POLICY IF EXISTS "admin_users_update" ON public.admin_users;
        DROP POLICY IF EXISTS "admin_users_insert_own" ON public.admin_users;
        
        -- Merged SELECT
        CREATE POLICY "admin_users_select" ON public.admin_users FOR SELECT TO authenticated USING ( true );
        -- Merged UPDATE
        CREATE POLICY "admin_users_update" ON public.admin_users FOR UPDATE 
            USING ( (SELECT auth.uid())::text = user_id OR EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role = 'owner') );
        -- Optimized INSERT
        CREATE POLICY "admin_users_insert_own" ON public.admin_users FOR INSERT WITH CHECK ( (SELECT auth.uid())::text = user_id );
    END IF;

    ---------------------------------------------------------------------------
    -- 3. CHAT & CONVERSATIONS (PERFORMANCE & MERGING)
    ---------------------------------------------------------------------------
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_messages') THEN
        DROP POLICY IF EXISTS "chat_messages_read" ON public.chat_messages;
        DROP POLICY IF EXISTS "chat_messages_view" ON public.chat_messages;
        DROP POLICY IF EXISTS "chat_messages_insert" ON public.chat_messages;
        DROP POLICY IF EXISTS "chat_messages_update" ON public.chat_messages;
        DROP POLICY IF EXISTS "chat_messages_insert_admin" ON public.chat_messages;
        DROP POLICY IF EXISTS "chat_messages_select" ON public.chat_messages;
        DROP POLICY IF EXISTS "chat_messages_insert_user" ON public.chat_messages;
        DROP POLICY IF EXISTS "chat_messages_update_own" ON public.chat_messages;
        DROP POLICY IF EXISTS "chat_messages_admin_all" ON public.chat_messages;

        CREATE POLICY "chat_messages_select" ON public.chat_messages FOR SELECT TO authenticated USING ( true );
        CREATE POLICY "chat_messages_insert_user" ON public.chat_messages FOR INSERT WITH CHECK ( (SELECT auth.uid()) = sender_id );
        CREATE POLICY "chat_messages_update_own" ON public.chat_messages FOR UPDATE USING ( (SELECT auth.uid()) = sender_id );
        CREATE POLICY "chat_messages_admin_all" ON public.chat_messages FOR ALL TO authenticated 
            USING ( EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversations') THEN
        DROP POLICY IF EXISTS "conversations_read" ON public.conversations;
        DROP POLICY IF EXISTS "conversations_view" ON public.conversations;
        DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;
        
        CREATE POLICY "conversations_read" ON public.conversations FOR SELECT TO authenticated USING ( true );
        CREATE POLICY "conversations_insert" ON public.conversations FOR INSERT WITH CHECK ( (SELECT auth.uid()) = student_id OR (SELECT auth.uid()) = coordinator_id );
    END IF;

    ---------------------------------------------------------------------------
    -- 4. SETTINGS & PAGE CONTENT (MERGING)
    ---------------------------------------------------------------------------
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'about_settings') THEN
        DROP POLICY IF EXISTS "about_settings_read" ON public.about_settings;
        DROP POLICY IF EXISTS "about_settings_select" ON public.about_settings;
        CREATE POLICY "about_settings_read" ON public.about_settings FOR SELECT TO anon, authenticated USING ( true );
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'announcements') THEN
        DROP POLICY IF EXISTS "announcements_read" ON public.announcements;
        DROP POLICY IF EXISTS "announcements_view" ON public.announcements;
        DROP POLICY IF EXISTS "announcements_insert" ON public.announcements;
        DROP POLICY IF EXISTS "announcements_update" ON public.announcements;
        DROP POLICY IF EXISTS "announcements_delete" ON public.announcements;
        DROP POLICY IF EXISTS "announcements_admin_all" ON public.announcements;

        CREATE POLICY "announcements_read" ON public.announcements FOR SELECT USING ( true );
        CREATE POLICY "announcements_admin_all" ON public.announcements FOR ALL TO authenticated 
            USING ( EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    ---------------------------------------------------------------------------
    -- 5. SOCIAL & LIKES (PERFORMANCE)
    ---------------------------------------------------------------------------
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profile_likes') THEN
        DROP POLICY IF EXISTS "Auth users can like" ON public.profile_likes;
        DROP POLICY IF EXISTS "Owners can unlike" ON public.profile_likes;
        DROP POLICY IF EXISTS "owner_or_liker_can_view_likes" ON public.profile_likes;
        DROP POLICY IF EXISTS "profile_likes_select" ON public.profile_likes;
        DROP POLICY IF EXISTS "profile_likes_insert" ON public.profile_likes;
        DROP POLICY IF EXISTS "profile_likes_delete" ON public.profile_likes;

        CREATE POLICY "profile_likes_select" ON public.profile_likes FOR SELECT TO authenticated USING ( true );
        CREATE POLICY "profile_likes_insert" ON public.profile_likes FOR INSERT WITH CHECK ( (SELECT auth.uid()) = liker_id );
        CREATE POLICY "profile_likes_delete" ON public.profile_likes FOR DELETE USING ( (SELECT auth.uid()) = liker_id OR (SELECT auth.uid()) = profile_id );
    END IF;

    ---------------------------------------------------------------------------
    -- 6. TEAMS (PERFORMANCE & MERGING)
    ---------------------------------------------------------------------------
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teams') THEN
        DROP POLICY IF EXISTS "Users can create teams" ON public.teams;
        DROP POLICY IF EXISTS "teams_insert" ON public.teams;
        CREATE POLICY "teams_insert" ON public.teams FOR INSERT WITH CHECK ( (SELECT auth.uid()) = created_by );
    END IF;

    ---------------------------------------------------------------------------
    -- 7. MISC MANAGEMENT (PERFORMANCE)
    ---------------------------------------------------------------------------
    -- guest_artists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'guest_artists') THEN
        DROP POLICY IF EXISTS "guest_artists_read" ON public.guest_artists;
        DROP POLICY IF EXISTS "guest_artists_view" ON public.guest_artists;
        DROP POLICY IF EXISTS "guest_artists_modify" ON public.guest_artists;
        DROP POLICY IF EXISTS "guest_artists_admin_write" ON public.guest_artists;
        DROP POLICY IF EXISTS "guest_artists_admin_all" ON public.guest_artists;

        CREATE POLICY "guest_artists_read" ON public.guest_artists FOR SELECT USING ( true );
        CREATE POLICY "guest_artists_admin_all" ON public.guest_artists FOR ALL TO authenticated 
            USING ( EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- entry_passes
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'entry_passes') THEN
        DROP POLICY IF EXISTS "entry_passes_public_select_own" ON public.entry_passes;
        DROP POLICY IF EXISTS "entry_passes_read" ON public.entry_passes;
        DROP POLICY IF EXISTS "entry_passes_read_own" ON public.entry_passes;
        CREATE POLICY "entry_passes_read_own" ON public.entry_passes FOR SELECT TO authenticated USING ( (SELECT auth.uid()) = user_id );
    END IF;

    -- pass_registrations (No user_id column, removing read_own)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pass_registrations') THEN
        DROP POLICY IF EXISTS "pass_registrations_select_own" ON public.pass_registrations;
        DROP POLICY IF EXISTS "pass_registrations_read" ON public.pass_registrations;
        DROP POLICY IF EXISTS "pass_registrations_read_own" ON public.pass_registrations;
    END IF;

    -- health_heartbeats
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'health_heartbeats') THEN
        DROP POLICY IF EXISTS "read_health_heartbeats" ON public.health_heartbeats;
        CREATE POLICY "read_health_heartbeats" ON public.health_heartbeats FOR SELECT TO authenticated USING ( (SELECT auth.role()) = 'authenticated' );
    END IF;

    -- roadmap_milestones
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'roadmap_milestones') THEN
        DROP POLICY IF EXISTS "roadmap_milestones_read" ON public.roadmap_milestones;
        DROP POLICY IF EXISTS "roadmap_milestones_view" ON public.roadmap_milestones;
        DROP POLICY IF EXISTS "roadmap_milestones_modify" ON public.roadmap_milestones;
        DROP POLICY IF EXISTS "roadmap_milestones_admin_all" ON public.roadmap_milestones;

        CREATE POLICY "roadmap_milestones_read" ON public.roadmap_milestones FOR SELECT USING ( true );
        CREATE POLICY "roadmap_milestones_admin_all" ON public.roadmap_milestones FOR ALL TO authenticated 
            USING ( EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    ---------------------------------------------------------------------------
    -- 8. BIOMETRICS (PERFORMANCE)
    ---------------------------------------------------------------------------
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'biometric_profiles') THEN
        DROP POLICY IF EXISTS "admin_own_biometric_select" ON public.biometric_profiles;
        DROP POLICY IF EXISTS "admin_own_biometric_insert" ON public.biometric_profiles;
        DROP POLICY IF EXISTS "admin_own_biometric_update" ON public.biometric_profiles;
        DROP POLICY IF EXISTS "admin_own_biometric_delete" ON public.biometric_profiles;
        DROP POLICY IF EXISTS "biometric_profiles_read" ON public.biometric_profiles;
        DROP POLICY IF EXISTS "biometric_profiles_modify_own" ON public.biometric_profiles;

        CREATE POLICY "biometric_profiles_read" ON public.biometric_profiles FOR SELECT TO authenticated USING ( (SELECT auth.uid()) = user_id );
        CREATE POLICY "biometric_profiles_modify_own" ON public.biometric_profiles FOR ALL TO authenticated 
            USING ( (SELECT auth.uid()) = user_id );
    END IF;

    ---------------------------------------------------------------------------
    -- 9. STANDARDIZED ADMIN ACCESS FOR ALL OTHER TABLES
    ---------------------------------------------------------------------------
    -- This section covers the long list of tables with _admin_write or _admin_update policies.
    -- We'll use a loop-friendly approach for simple "All Access for Admin" logic.

    FOREACH tbl_name IN ARRAY admin_tables LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl_name) THEN
            -- Drop specific variations mentioned in linter
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl_name || '_admin_write', tbl_name);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl_name || '_admin_update', tbl_name);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl_name || '_admin_delete', tbl_name);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Admins can manage allowed admins', tbl_name);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'auditions_admin_delete', tbl_name);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'auditions_admin_update', tbl_name);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'gallery_faces_select_authenticated', tbl_name);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'gallery_faces_insert_admin', tbl_name);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'gallery_faces_update_admin', tbl_name);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'gallery_faces_delete_admin', tbl_name);
            -- Also drop the new policy name to allow reruns
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl_name || '_admin_all', tbl_name);

            -- Standardized optimized admin policy
            EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated 
                USING ( EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN (''admin'', ''owner'')) )',
                tbl_name || '_admin_all', tbl_name);
        END IF;
    END LOOP;

END $$;
