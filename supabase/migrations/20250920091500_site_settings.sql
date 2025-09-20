-- site_settings singleton for global Coming Soon/Maintenance
-- Creates a single-row table (id=1) controlling public site gating

create table if not exists public.site_settings (
  id integer primary key check (id = 1),
  site_closed boolean not null default false,
  coming_soon_enabled boolean not null default false,
  coming_soon_until timestamptz null,
  coming_soon_title text null,
  coming_soon_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at trigger
create or replace function public.trg_site_settings_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_site_settings_set_updated_at on public.site_settings;
create trigger trg_site_settings_set_updated_at
before update on public.site_settings
for each row execute function public.trg_site_settings_updated_at();

-- seed singleton row
insert into public.site_settings (id)
values (1)
on conflict (id) do nothing;

-- RLS
alter table public.site_settings enable row level security;

-- Allow anyone to read (public site needs to know gating state)
drop policy if exists site_settings_select on public.site_settings;
create policy site_settings_select on public.site_settings
for select using (true);

-- Note: Update policy is intentionally not created here.
-- A later migration (20250920095500_site_settings_admin_rls.sql) adds an admin-only update policy via public.is_admin().

-- Ensure PostgREST schema cache reloads in hosted environments
do $$ begin
  perform pg_notify('pgrst', 'reload schema');
exception when others then null; end $$;
