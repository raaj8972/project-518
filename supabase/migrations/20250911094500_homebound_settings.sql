-- HomeBound settings: store Instagram link separately from global social media

create table if not exists public.homebound_settings (
  id integer primary key,
  instagram_url text,
  instagram_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure singleton row with id=1 exists
insert into public.homebound_settings (id, instagram_url, instagram_enabled)
values (1, null, true)
on conflict (id) do nothing;

-- Simple updated_at trigger
create or replace function public.set_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

create trigger homebound_settings_set_timestamp
before update on public.homebound_settings
for each row execute procedure public.set_timestamp();

-- RLS and policies
alter table public.homebound_settings enable row level security;

-- Drop any existing policies (idempotent)
do $$
begin
  begin
    drop policy if exists "anon_select_homebound_settings" on public.homebound_settings;
  exception when undefined_object then null; end;
  begin
    drop policy if exists "auth_manage_homebound_settings" on public.homebound_settings;
  exception when undefined_object then null; end;
end $$;

-- Allow anonymous read so the public page can display the link
create policy "anon_select_homebound_settings"
  on public.homebound_settings
  for select
  to anon
  using (true);

-- Allow authenticated users (admins) to read/update
create policy "auth_manage_homebound_settings"
  on public.homebound_settings
  for all
  to authenticated
  using (true)
  with check (true);

-- Optional: grants to complement RLS
grant usage on schema public to anon, authenticated;
grant select on table public.homebound_settings to anon;
grant select, insert, update on table public.homebound_settings to authenticated;
