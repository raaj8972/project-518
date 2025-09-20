-- Fix has_permission() to compare uuid correctly (no text cast)
-- Previously used: where user_id = v_uid::text, which fails since user_id is uuid

create or replace function public.has_permission(p_section text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_owner boolean := false;
  v_perm record;
begin
  if v_uid is null then
    return false;
  end if;

  -- Owner has all permissions
  select public.is_owner() into v_is_owner;
  if coalesce(v_is_owner, false) then
    return true;
  end if;

  -- Fetch permission row once (compare uuid to uuid)
  select * into v_perm from public.admin_permissions where user_id = v_uid limit 1;
  if not found then
    return false;
  end if;

  case lower(trim(p_section))
    when 'events' then return coalesce(v_perm.can_events, false);
    when 'schedule' then return coalesce(v_perm.can_schedule, false);
    when 'gallery' then return coalesce(v_perm.can_gallery, false);
    when 'sponsors' then return coalesce(v_perm.can_sponsors, false);
    when 'registrations' then return coalesce(v_perm.can_registrations, false);
    when 'registration_photos' then return coalesce(v_perm.can_registration_photos, false);
    when 'faculty' then return coalesce(v_perm.can_faculty, false);
    when 'core_team' then return coalesce(v_perm.can_core_team, false);
    when 'guest_artists' then return coalesce(v_perm.can_guest_artists, false);
    when 'chief_guests' then return coalesce(v_perm.can_chief_guests, false);
    when 'homebound' then return coalesce(v_perm.can_homebound, false);
    else return false;
  end case;
end $$;

-- Ask PostgREST to reload to pick up function change
do $$ begin perform pg_notify('pgrst', 'reload schema'); exception when others then null; end $$;
