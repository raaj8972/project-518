-- Migration: Add reset_registration_id_sequence RPC
-- Description: Allows admins to reset the registration ID sequence.

CREATE OR REPLACE FUNCTION "public"."reset_registration_id_sequence"() RETURNS void
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
    -- Check if requester is an admin
    IF NOT (
        EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text AND role IN ('owner', 'admin'))
        OR 
        EXISTS (SELECT 1 FROM public.allowed_admins WHERE email = (auth.jwt() ->> 'email') AND role IN ('owner', 'admin'))
    ) THEN
        RAISE EXCEPTION 'NOT_AUTHORIZED';
    END IF;

    -- Reset the sequences
    -- We try-catch or just use IF EXISTS to avoid errors if sequences are missing
    BEGIN
        ALTER SEQUENCE IF EXISTS public.registration_id_seq RESTART WITH 1;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        ALTER SEQUENCE IF EXISTS public.sports_registrations_id_seq RESTART WITH 1;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION "public"."reset_registration_id_sequence"() TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."reset_registration_id_sequence"() TO "service_role";
