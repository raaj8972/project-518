-- Introduce owner role and protect primary admin from removal

-- Create enum for roles
do $$ begin
  create type public.admin_role as enum ('owner', 'admin');
exception when duplicate_object then null; end $$;

-- Add role column (default 'admin') and optional is_primary flag (for clarity)
do $$ begin
  alter table public.admin_users add column if not exists role public.admin_role not null default 'admin';
exception when undefined_table then null; end $$;

-- Optional clear marker; not required if using role enum alone
do $$ begin
  alter table public.admin_users add column if not exists is_primary boolean not null default false;
exception when undefined_table then null; end $$;

-- Ensure only one owner exists
do $$ begin
  create unique index if not exists admin_users_single_owner on public.admin_users ((role)) where role = 'owner';
exception when others then null; end $$;

-- Helper: determine if current auth.uid() is the owner
create or replace function public.is_owner()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.admin_users a where a.user_id = auth.uid() and a.role = 'owner'
  );
$$;

-- Keep is_admin() broad: any row in admin_users
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.admin_users a where a.user_id = auth.uid()
  );
$$;

-- Tighten admin_users policies: only OWNER can add/remove/update after bootstrap
drop policy if exists admin_users_insert on public.admin_users;
create policy admin_users_insert on public.admin_users
for insert to authenticated
with check (
  -- Allow inserts if caller is owner OR if there is no owner yet (ownerless recovery)
  public.is_owner() OR NOT EXISTS (
    select 1 from public.admin_users where role = 'owner'
  )
);

drop policy if exists admin_users_update on public.admin_users;
create policy admin_users_update on public.admin_users
for update to authenticated
using (
  -- Allow updates if caller is owner OR if there is no owner yet (ownerless recovery)
  public.is_owner() OR NOT EXISTS (
    select 1 from public.admin_users where role = 'owner'
  )
) with check (
  public.is_owner() OR NOT EXISTS (
    select 1 from public.admin_users where role = 'owner'
  )
);

drop policy if exists admin_users_delete on public.admin_users;
create policy admin_users_delete on public.admin_users
for delete to authenticated
using (public.is_owner() AND role <> 'owner');

-- Ensure site_settings update remains for any admin (owner or regular admin)
drop policy if exists site_settings_update on public.site_settings;
create policy site_settings_update on public.site_settings
for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Update RPC to set first admin as OWNER and mark is_primary
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
  v_has_owner boolean;
  v_role public.admin_role := 'admin';
begin
  if p_email is null or length(trim(p_email)) = 0 then
    raise exception 'INVALID_EMAIL';
  end if;
  select exists(select 1 from public.admin_users) into v_has_admin;
  select exists(select 1 from public.admin_users where role = 'owner') into v_has_owner;
  -- If an owner already exists, only the owner can add more admins
  if v_has_owner and not public.is_owner() then
    raise exception 'NOT_OWNER';
  end if;
  -- If there is no owner yet (even if admins exist), promote this email to owner
  if not v_has_owner then
    v_role := 'owner';
  end if;
  select u.id into v_uid from auth.users u where lower(u.email) = lower(p_email) limit 1;
  if v_uid is null then
    raise exception 'NO_SUCH_USER';
  end if;
  select exists(select 1 from public.admin_users a where a.user_id = v_uid) into v_exists;
  if v_exists then
    return true; -- already admin, treat as success
  end if;
  insert into public.admin_users(user_id, email, role, is_primary)
  values (v_uid, p_email, v_role, (v_role = 'owner'))
  on conflict (user_id) do nothing;
  return true;
end;
$$;

revoke execute on function public.add_admin_by_email(text) from public;
grant execute on function public.add_admin_by_email(text) to authenticated;

-- Ask PostgREST to reload
do $$ begin
  perform pg_notify('pgrst', 'reload schema');
exception when others then null; end $$;

-- If there are admins but no owner (e.g., pre-existing records before this migration),
-- auto-promote the first admin to owner to avoid ownerless lockout.
do $$
begin
  if exists (select 1 from public.admin_users)
     and not exists (select 1 from public.admin_users where role = 'owner') then
    update public.admin_users
    set role = 'owner', is_primary = true
    where user_id = (select user_id from public.admin_users limit 1);
  end if;
exception when others then
  -- best-effort; ignore if table missing or other issues
  null;
end $$;
