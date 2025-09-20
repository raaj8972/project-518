-- Tighten site_settings updates to admin-only via admin_users + is_admin()

-- Admin users table referencing auth.users
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- Helper: determine if current auth.uid() is an admin
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.admin_users a where a.user_id = auth.uid()
  );
$$;

-- Policies for admin_users
-- Read: allow authenticated to read (useful for UI visibility); the table contains only emails/uuids
drop policy if exists admin_users_select_all on public.admin_users;
create policy admin_users_select_all on public.admin_users
for select to authenticated using (true);

-- Insert: allow bootstrap by any authenticated user if table is empty; otherwise only admins can add others
drop policy if exists admin_users_insert on public.admin_users;
create policy admin_users_insert on public.admin_users
for insert to authenticated
with check (
  public.is_admin() OR NOT EXISTS (select 1 from public.admin_users)
);

-- Update/Delete: only admins
drop policy if exists admin_users_update on public.admin_users;
create policy admin_users_update on public.admin_users
for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists admin_users_delete on public.admin_users;
create policy admin_users_delete on public.admin_users
for delete to authenticated using (public.is_admin());

-- Now restrict site_settings update to admins only
drop policy if exists site_settings_update on public.site_settings;
create policy site_settings_update on public.site_settings
for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Keep public read of site_settings for gating
drop policy if exists site_settings_select on public.site_settings;
create policy site_settings_select on public.site_settings
for select using (true);

-- Convenience RPC: add admin by email (the user must already exist in auth.users)
-- Rules:
--  - If admin_users is empty, allow bootstrap by any authenticated caller
--  - Otherwise, only existing admins can add another admin
--  - Looks up auth.users.id by email and inserts into admin_users
create or replace function public.add_admin_by_email(p_email text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid;
  v_exists boolean;
  v_has_admin boolean;
begin
  if p_email is null or length(trim(p_email)) = 0 then
    raise exception 'INVALID_EMAIL';
  end if;
  select exists(select 1 from public.admin_users) into v_has_admin;
  if v_has_admin and not public.is_admin() then
    raise exception 'NOT_ADMIN';
  end if;
  select u.id into v_uid from auth.users u where lower(u.email) = lower(p_email) limit 1;
  if v_uid is null then
    raise exception 'NO_SUCH_USER';
  end if;
  select exists(select 1 from public.admin_users a where a.user_id = v_uid) into v_exists;
  if v_exists then
    return true; -- already admin, treat as success
  end if;
  insert into public.admin_users(user_id, email) values (v_uid, p_email)
  on conflict (user_id) do nothing;
  return true;
end;
$$;

-- Only authenticated users can call; function enforces admin/bootstrapping internally
revoke execute on function public.add_admin_by_email(text) from public;
grant execute on function public.add_admin_by_email(text) to authenticated;

-- Ask PostgREST to reload
do $$ begin
  perform pg_notify('pgrst', 'reload schema');
exception when others then null; end $$;
