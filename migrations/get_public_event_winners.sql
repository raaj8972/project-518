-- Create a function to fetch event winners with public registration details
-- This allows us to show team member names without exposing the entire registrations table

create or replace function public.get_public_event_winners()
returns table (
  id bigint,
  event_id bigint,
  registration_id text,
  "position" integer,
  name text,
  category text,
  year text,
  photo_url text,
  created_at timestamptz,
  registration_name text,
  team_members jsonb,
  team_name text,
  is_team_registration boolean
) 
language sql
security definer
as $$
  select 
    w.id,
    w.event_id,
    w.registration_id::text,
    w.position,
    w.name,
    w.category,
    w.year,
    w.photo_url,
    w.created_at,
    r.full_name as registration_name,
    r.team_members,
    r.team_name,
    r.is_team_registration
  from public.event_winners w
  left join public.registrations r on w.registration_id::text = r.id::text;
$$;

-- Grant execute permission to everyone (public)
grant execute on function public.get_public_event_winners() to public;
grant execute on function public.get_public_event_winners() to anon;
grant execute on function public.get_public_event_winners() to authenticated;
