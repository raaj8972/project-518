-- Add photo_url to registrations if it doesn't exist and update RPC to accept it
-- Safe to run multiple times

-- 1) Add column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'registrations' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE public.registrations ADD COLUMN photo_url text;
  END IF;
END$$;

-- 2) Update function signature to include p_photo_url and store it
create or replace function public.register_for_event(
  p_id text,
  p_event_id integer,
  p_event_title text,
  p_participant_type text,
  p_full_name text,
  p_email text,
  p_phone text,
  p_college text,
  p_motivation text,
  p_registration_date timestamptz,
  p_is_team_registration boolean,
  p_team_name text,
  p_team_members jsonb,
  p_total_members integer,
  p_photo_url text
) returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id text := coalesce(p_id, 'REG-'||extract(epoch from now())::bigint::text||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6)));
begin
  insert into public.registrations(
    id,
    event_id,
    event_title,
    participant_type,
    full_name,
    email,
    phone,
    college,
    motivation,
    registration_date,
    status,
    is_team_registration,
    team_name,
    team_members,
    total_members,
    photo_url
  ) values (
    v_id,
    p_event_id,
    p_event_title,
    p_participant_type,
    p_full_name,
    p_email,
    p_phone,
    p_college,
    coalesce(p_motivation, ''),
    coalesce(p_registration_date, now()),
    'pending',
    coalesce(p_is_team_registration, false),
    p_team_name,
    p_team_members,
    coalesce(p_total_members, 1),
    p_photo_url
  );

  return v_id;
end;
$$;

-- 3) Grant execute to anon/public (for public forms)
GRANT EXECUTE ON FUNCTION public.register_for_event(
  text, integer, text, text, text, text, text, text, text, timestamptz, boolean, text, jsonb, integer, text
) TO anon;
GRANT EXECUTE ON FUNCTION public.register_for_event(
  text, integer, text, text, text, text, text, text, text, timestamptz, boolean, text, jsonb, integer, text
) TO public;

-- 4) Nudge PostgREST to reload
NOTIFY pgrst, 'reload schema';
