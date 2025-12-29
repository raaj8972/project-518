-- Add can_security_passes permission to admin_permissions
-- This allows owners to toggle access to the "Entry Pass Security" section for other admins.

-- 1) Add the column
alter table if exists public.admin_permissions
  add column if not exists can_security_passes boolean not null default false;

-- 2) Update has_permission(text) to support 'security_passes'
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

  -- Fetch permission row
  select * into v_perm from public.admin_permissions where user_id = v_uid::text limit 1;
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
    when 'sports' then return coalesce(v_perm.can_sports, false);
    when 'security_passes' then return coalesce(v_perm.can_security_passes, false);
    else return false;
  end case;
end $$;

-- 3) Reload schema
do $$ begin perform pg_notify('pgrst', 'reload schema'); exception when others then null; end $$;
