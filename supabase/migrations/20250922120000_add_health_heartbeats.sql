-- Create health_heartbeats table to track scheduled job runs
create table if not exists public.health_heartbeats (
  id int primary key,
  last_run timestamptz not null default now(),
  updated_by text null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger to update updated_at on change
create or replace function public.set_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_timestamp_on_health_heartbeats on public.health_heartbeats;
create trigger set_timestamp_on_health_heartbeats
before update on public.health_heartbeats
for each row execute function public.set_timestamp();

-- RLS: enable and allow select for authenticated users; writes via service role
alter table public.health_heartbeats enable row level security;

-- Allow reads for authenticated users (admins)
create policy if not exists health_heartbeats_select_auth
  on public.health_heartbeats
  for select
  to authenticated
  using (true);

-- Optional: allow public read if desired
-- create policy if not exists health_heartbeats_select_anon
--   on public.health_heartbeats
--   for select
--   to anon
--   using (true);

-- No insert/update/delete policies for anon/auth; service_role bypasses RLS.

-- Seed a row with id=1 if missing
insert into public.health_heartbeats (id, last_run, updated_by, notes)
values (1, now(), 'migration', 'seed row')
on conflict (id) do nothing;
