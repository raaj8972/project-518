-- 20260328150000_rls_performance_and_cleanup.sql
-- PERFORMANCE & HYGIENE FIXES FOR RLS POLICIES (WITH EXISTENCE CHECKS)

DO $$ 
BEGIN
    -- admin_roles
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_roles') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to view categories" ON public.admin_roles;
        DROP POLICY IF EXISTS "Allow authenticated users to view roles" ON public.admin_roles;
        DROP POLICY IF EXISTS "admin_roles_select" ON public.admin_roles;
        CREATE POLICY "admin_roles_read" ON public.admin_roles AS PERMISSIVE FOR SELECT TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL );
    END IF;

    -- admin_users
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_users') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to view admin users" ON public.admin_users;
        DROP POLICY IF EXISTS "Allow authenticated users to view categories" ON public.admin_users;
        DROP POLICY IF EXISTS "admin_users_admin_select" ON public.admin_users;
        CREATE POLICY "admin_users_read_all" ON public.admin_users AS PERMISSIVE FOR SELECT TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL );
    END IF;

    -- auctions
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'auctions') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to delete auctions" ON public.auctions;
        DROP POLICY IF EXISTS "Allow authenticated users to update auctions" ON public.auctions;
        DROP POLICY IF EXISTS "auctions_admin_all" ON public.auctions;
        DROP POLICY IF EXISTS "auctions_admin_write" ON public.auctions;
        CREATE POLICY "auctions_admin_write" ON public.auctions AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- council_applications
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'council_applications') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to delete applications" ON public.council_applications;
        DROP POLICY IF EXISTS "Allow authenticated users to update applications" ON public.council_applications;
        CREATE POLICY "council_applications_admin_all" ON public.council_applications AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- council_feedback
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'council_feedback') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to delete feedback" ON public.council_feedback;
        DROP POLICY IF EXISTS "Allow authenticated users to update feedback" ON public.council_feedback;
        CREATE POLICY "council_feedback_admin_all" ON public.council_feedback AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- council_meetings
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'council_meetings') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to delete meetings" ON public.council_meetings;
        DROP POLICY IF EXISTS "Allow authenticated users to update meetings" ON public.council_meetings;
        CREATE POLICY "council_meetings_admin_all" ON public.council_meetings AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- council_members
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'council_members') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to delete members" ON public.council_members;
        DROP POLICY IF EXISTS "Allow authenticated users to update members" ON public.council_members;
        CREATE POLICY "council_members_admin_all" ON public.council_members AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- council_notices
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'council_notices') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to delete notices" ON public.council_notices;
        DROP POLICY IF EXISTS "Allow authenticated users to update notices" ON public.council_notices;
        CREATE POLICY "council_notices_admin_all" ON public.council_notices AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- event_feedback
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'event_feedback') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to delete feedback" ON public.event_feedback;
        DROP POLICY IF EXISTS "Allow authenticated users to update feedback" ON public.event_feedback;
        CREATE POLICY "event_feedback_admin_all" ON public.event_feedback AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- event_images
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'event_images') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to delete images" ON public.event_images;
        DROP POLICY IF EXISTS "Allow authenticated users to update images" ON public.event_images;
        CREATE POLICY "event_images_admin_all" ON public.event_images AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- event_registrations
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'event_registrations') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to delete registrations" ON public.event_registrations;
        DROP POLICY IF EXISTS "Allow authenticated users to update registrations" ON public.event_registrations;
        CREATE POLICY "event_registrations_admin_all" ON public.event_registrations AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- event_venues
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'event_venues') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to delete venues" ON public.event_venues;
        DROP POLICY IF EXISTS "Allow authenticated users to update venues" ON public.event_venues;
        CREATE POLICY "event_venues_admin_all" ON public.event_venues AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- events
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to update accounts" ON public.events;
        DROP POLICY IF EXISTS "Allow authenticated users to update auditions" ON public.events;
        DROP POLICY IF EXISTS "Allow authenticated users to update categories" ON public.events;
        DROP POLICY IF EXISTS "Allow authenticated users to update event_registrations" ON public.events;
        DROP POLICY IF EXISTS "Allow authenticated users to update events" ON public.events;
        DROP POLICY IF EXISTS "Allow authenticated users to update facility_bookings" ON public.events;
        DROP POLICY IF EXISTS "Allow authenticated users to update gallery_categories" ON public.events;
        DROP POLICY IF EXISTS "Allow authenticated users to update gallery_items" ON public.events;
        DROP POLICY IF EXISTS "Allow authenticated users to update grievance_messages" ON public.events;
        DROP POLICY IF EXISTS "Allow authenticated users to update grievances" ON public.events;
        DROP POLICY IF EXISTS "Allow authenticated users to update membership_applications" ON public.events;
        DROP POLICY IF EXISTS "Allow authenticated users to update memberships" ON public.events;
        DROP POLICY IF EXISTS "Allow authenticated users to update news" ON public.events;
        DROP POLICY IF EXISTS "Allow authenticated users to update notifications" ON public.events;
        DROP POLICY IF EXISTS "Allow authenticated users to update profiles" ON public.events;
        DROP POLICY IF EXISTS "Allow authenticated users to update registrations" ON public.events;
        DROP POLICY IF EXISTS "Allow authenticated users to update resource_bookings" ON public.events;
        DROP POLICY IF EXISTS "Allow authenticated users to update resources" ON public.events;
        DROP POLICY IF EXISTS "Allow authenticated users to update site_settings" ON public.events;
        DROP POLICY IF EXISTS "Allow authenticated users to update sports_registrations" ON public.events;
        DROP POLICY IF EXISTS "events_admin_all" ON public.events;
        CREATE POLICY "events_admin_all" ON public.events AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- facilities
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'facilities') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to delete facilities" ON public.facilities;
        DROP POLICY IF EXISTS "Allow authenticated users to update facilities" ON public.facilities;
        CREATE POLICY "facilities_admin_all" ON public.facilities AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- facility_bookings
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'facility_bookings') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to delete bookings" ON public.facility_bookings;
        DROP POLICY IF EXISTS "Allow authenticated users to update bookings" ON public.facility_bookings;
        CREATE POLICY "facility_bookings_admin_all" ON public.facility_bookings AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- gallery_categories
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gallery_categories') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to delete categories" ON public.gallery_categories;
        DROP POLICY IF EXISTS "Allow authenticated users to update categories" ON public.gallery_categories;
        CREATE POLICY "gallery_categories_admin_all" ON public.gallery_categories AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- gallery_items
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gallery_items') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to delete items" ON public.gallery_items;
        DROP POLICY IF EXISTS "Allow authenticated users to update items" ON public.gallery_items;
        CREATE POLICY "gallery_items_admin_all" ON public.gallery_items AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- grievance_messages
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'grievance_messages') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to delete messages" ON public.grievance_messages;
        DROP POLICY IF EXISTS "Allow authenticated users to update messages" ON public.grievance_messages;
        CREATE POLICY "grievance_messages_admin_all" ON public.grievance_messages AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- grievances
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'grievances') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to delete grievances" ON public.grievances;
        DROP POLICY IF EXISTS "Allow authenticated users to update grievances" ON public.grievances;
        CREATE POLICY "grievances_admin_all" ON public.grievances AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- membership_applications
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'membership_applications') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to delete applications" ON public.membership_applications;
        DROP POLICY IF EXISTS "Allow authenticated users to update applications" ON public.membership_applications;
        CREATE POLICY "membership_applications_admin_all" ON public.membership_applications AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- membership_types
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'membership_types') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to delete types" ON public.membership_types;
        DROP POLICY IF EXISTS "Allow authenticated users to update types" ON public.membership_types;
        CREATE POLICY "membership_types_admin_all" ON public.membership_types AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- memberships
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'memberships') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to update memberships" ON public.memberships;
        DROP POLICY IF EXISTS "memberships_admin_update" ON public.memberships;
        DROP POLICY IF EXISTS "memberships_admin_delete" ON public.memberships;
        CREATE POLICY "memberships_admin_all" ON public.memberships AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- news
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'news') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to delete news" ON public.news;
        DROP POLICY IF EXISTS "Allow authenticated users to update news" ON public.news;
        CREATE POLICY "news_admin_all" ON public.news AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- notifications
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to delete notifications" ON public.notifications;
        DROP POLICY IF EXISTS "Allow authenticated users to update notifications" ON public.notifications;
        DROP POLICY IF EXISTS "notifications_admin_update" ON public.notifications;
        DROP POLICY IF EXISTS "notifications_admin_delete" ON public.notifications;
        CREATE POLICY "notifications_admin_all" ON public.notifications AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- profiles
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        DROP POLICY IF EXISTS "profiles_admin_delete" ON public.profiles;
        CREATE POLICY "profiles_admin_all" ON public.profiles AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- registrations
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'registrations') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to update registrations" ON public.registrations;
        DROP POLICY IF EXISTS "registrations_admin_update" ON public.registrations;
        DROP POLICY IF EXISTS "registrations_admin_delete" ON public.registrations;
        CREATE POLICY "registrations_admin_all" ON public.registrations AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- resource_bookings
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'resource_bookings') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to delete bookings" ON public.resource_bookings;
        DROP POLICY IF EXISTS "Allow authenticated users to update bookings" ON public.resource_bookings;
        CREATE POLICY "resource_bookings_admin_all" ON public.resource_bookings AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- resources
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'resources') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to delete resources" ON public.resources;
        DROP POLICY IF EXISTS "Allow authenticated users to update resources" ON public.resources;
        CREATE POLICY "resources_admin_all" ON public.resources AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- site_settings
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'site_settings') THEN
        DROP POLICY IF EXISTS "site_settings_admin_update" ON public.site_settings;
        CREATE POLICY "site_settings_admin_all" ON public.site_settings AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- sports_registrations
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sports_registrations') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to update sports_registrations" ON public.sports_registrations;
        CREATE POLICY "sports_registrations_admin_all" ON public.sports_registrations AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- suggested_events
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'suggested_events') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to delete suggested_events" ON public.suggested_events;
        DROP POLICY IF EXISTS "Allow authenticated users to update suggested_events" ON public.suggested_events;
        CREATE POLICY "suggested_events_admin_all" ON public.suggested_events AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- transactions
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transactions') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to delete transactions" ON public.transactions;
        DROP POLICY IF EXISTS "Allow authenticated users to update transactions" ON public.transactions;
        CREATE POLICY "transactions_admin_all" ON public.transactions AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- user_roles
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to delete roles" ON public.user_roles;
        DROP POLICY IF EXISTS "Allow authenticated users to update roles" ON public.user_roles;
        CREATE POLICY "user_roles_admin_all" ON public.user_roles AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- users
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to delete users" ON public.users;
        DROP POLICY IF EXISTS "Allow authenticated users to update users" ON public.users;
        CREATE POLICY "users_admin_all" ON public.users AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

    -- videos
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'videos') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to delete videos" ON public.videos;
        DROP POLICY IF EXISTS "Allow authenticated users to update videos" ON public.videos;
        CREATE POLICY "videos_admin_all" ON public.videos AS PERMISSIVE FOR ALL TO authenticated USING ( (SELECT auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')) );
    END IF;

END $$;
