-- RPC: update_form_settings
-- Safely upsert the singleton row (id=1) while enforcing admin authorization.
-- This uses SECURITY DEFINER so it can bypass RLS, but it performs its own authz check
-- against admin_permissions or admin_users for the current auth.uid().

create or replace function public.update_form_settings(
  p_audition_form_enabled boolean default null,
  p_audition_form_message text default null,
  p_membership_form_enabled boolean default null,
  p_membership_form_message text default null
)
returns public.form_settings
language plpgsql
security definer
set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_row public.form_settings;
begin
  -- Require authentication
  if v_uid is null then
    raise exception 'not_authenticated' using hint = 'Sign in required';
  end if;

  -- Authorization: must be admin via admin_permissions or admin_users
  if not exists (select 1 from public.admin_permissions ap where ap.user_id = v_uid)
     and not exists (select 1 from public.admin_users au where au.user_id = v_uid and au.role in ('owner','admin')) then
    raise exception 'forbidden';
  end if;

  insert into public.form_settings as fs (
    id,
    audition_form_enabled,
    audition_form_message,
    membership_form_enabled,
    membership_form_message
  ) values (
    1,
    p_audition_form_enabled,
    p_audition_form_message,
    p_membership_form_enabled,
    p_membership_form_message
  )
  on conflict (id) do update set
    audition_form_enabled = coalesce(excluded.audition_form_enabled, fs.audition_form_enabled),
    audition_form_message = coalesce(excluded.audition_form_message, fs.audition_form_message),
    membership_form_enabled = coalesce(excluded.membership_form_enabled, fs.membership_form_enabled),
    membership_form_message = coalesce(excluded.membership_form_message, fs.membership_form_message)
  returning * into v_row;

  return v_row;
end;
$$;

-- Permit execution from client roles
grant execute on function public.update_form_settings(boolean, text, boolean, text) to anon, authenticated;
