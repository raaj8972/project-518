-- Per-admin granular permissions managed by Owner

-- 1) Table: public.admin_permissions
create table if not exists public.admin_permissions (
  user_id uuid primary key references public.admin_users(user_id) on delete cascade,
  -- sections the admin can manage
  can_events boolean not null default false,
  -- future: can_sponsors, can_gallery, etc.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at trigger
create or replace function public.trg_admin_permissions_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_admin_permissions_set_updated_at on public.admin_permissions;
create trigger trg_admin_permissions_set_updated_at
before update on public.admin_permissions
for each row execute function public.trg_admin_permissions_updated_at();

alter table public.admin_permissions enable row level security;

-- Helper: does current user have a named permission?
create or replace function public.has_permission(p_section text)
returns boolean
language plpgsql
stable
as $$
declare v boolean;
begin
  -- owner always permitted
  if public.is_owner() then return true; end if;
  if p_section = 'events' then
    select ap.can_events into v from public.admin_permissions ap where ap.user_id = auth.uid();
    return coalesce(v,false);
  end if;
  return false;
end;
$$;

-- Policies: only OWNER can insert/update/delete; admins can read their own row
drop policy if exists admin_permissions_select on public.admin_permissions;
create policy admin_permissions_select on public.admin_permissions
for select to authenticated
using (user_id = auth.uid() or public.is_owner());

drop policy if exists admin_permissions_insert on public.admin_permissions;
create policy admin_permissions_insert on public.admin_permissions
for insert to authenticated
with check (public.is_owner());

drop policy if exists admin_permissions_update on public.admin_permissions;
create policy admin_permissions_update on public.admin_permissions
for update to authenticated
using (public.is_owner()) with check (public.is_owner());

drop policy if exists admin_permissions_delete on public.admin_permissions;
create policy admin_permissions_delete on public.admin_permissions
for delete to authenticated
using (public.is_owner());

-- Ensure schema cache refresh
do $$ begin perform pg_notify('pgrst', 'reload schema'); exception when others then null; end $$;
