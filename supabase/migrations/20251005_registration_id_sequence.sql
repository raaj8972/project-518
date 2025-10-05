-- Sequential Registration IDs (RICO-<n>)
-- This migration creates a sequence and an RPC to generate IDs like RICO-1, RICO-2, ...
-- It also updates the register_for_event() function to use this generator instead of random IDs.

-- 1) Create the sequence if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'S'
      AND c.relname = 'registration_id_seq'
      AND n.nspname = 'public'
  ) THEN
    EXECUTE 'CREATE SEQUENCE public.registration_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1';
  END IF;
END$$;

-- 2) Create helper RPC to get the next sequential ID
CREATE OR REPLACE FUNCTION public.next_registration_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_next bigint;
BEGIN
  SELECT nextval('public.registration_id_seq') INTO v_next;
  RETURN 'RICO-' || v_next::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_registration_id() TO anon;
GRANT EXECUTE ON FUNCTION public.next_registration_id() TO public;

-- 3) Align sequence to the current maximum numeric part of IDs that already match RICO-<n>
DO $$
DECLARE
  v_max bigint;
BEGIN
  SELECT COALESCE(MAX((substring(id from '^RICO-([0-9]+)$'))::bigint), 0) INTO v_max
  FROM public.registrations
  WHERE id ~ '^RICO-[0-9]+$';

  PERFORM setval('public.registration_id_seq', v_max, true);
END$$;

-- 4) Update register_for_event() to use sequential IDs by default
-- Keep signature and grants intact; only change ID generation
CREATE OR REPLACE FUNCTION public.register_for_event(
  p_id text,
  p_event_id integer,
  p_event_title text,
  p_participant_type text,
  p_full_name text,
  p_email text,
  p_phone text,
  p_college text,
  p_registration_date timestamptz,
  p_is_team_registration boolean,
  p_team_name text,
  p_team_members jsonb,
  p_total_members integer,
  p_photo_url text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_id text := COALESCE(p_id, public.next_registration_id());
BEGIN
  INSERT INTO public.registrations(
    id,
    event_id,
    event_title,
    participant_type,
    full_name,
    email,
    phone,
    college,
    registration_date,
    status,
    is_team_registration,
    team_name,
    team_members,
    total_members,
    photo_url
  ) VALUES (
    v_id,
    p_event_id,
    p_event_title,
    p_participant_type,
    p_full_name,
    p_email,
    p_phone,
    p_college,
    COALESCE(p_registration_date, now()),
    'pending',
    COALESCE(p_is_team_registration, false),
    p_team_name,
    p_team_members,
    COALESCE(p_total_members, 1),
    p_photo_url
  );

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_for_event(
  text, integer, text, text, text, text, text, text, timestamptz, boolean, text, jsonb, integer, text
) TO anon;
GRANT EXECUTE ON FUNCTION public.register_for_event(
  text, integer, text, text, text, text, text, text, timestamptz, boolean, text, jsonb, integer, text
) TO public;

NOTIFY pgrst, 'reload schema';
