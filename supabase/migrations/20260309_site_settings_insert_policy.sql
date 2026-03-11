-- Add INSERT policy for site_settings to support upsert
-- Upsert in Supabase (PostgREST) requires both INSERT and UPDATE permissions

CREATE POLICY site_settings_insert ON public.site_settings
    FOR INSERT
    WITH CHECK (can_edit_site_settings());

-- Reload cache
SELECT pg_notify('pgrst', 'reload schema');
