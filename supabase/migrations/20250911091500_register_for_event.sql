-- Create a SECURITY DEFINER function to insert a registration and let triggers handle counts
-- This function executes with the owner's privileges to bypass RLS for the insert/trigger path

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
  p_total_members integer
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
    total_members
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
    coalesce(p_total_members, 1)
  );

  -- Do NOT manually update events here; let triggers (if any) handle counts to avoid double increments.
  return v_id;
end;
$$;

-- Allow public/anon access to execute this function for public forms
grant execute on function public.register_for_event(
  text, integer, text, text, text, text, text, text, text, timestamptz, boolean, text, jsonb, integer
) to anon;
