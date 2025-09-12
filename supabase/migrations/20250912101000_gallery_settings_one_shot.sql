-- One-shot SQL: gallery_settings table + policies + reveal columns
-- Safe to run multiple times; uses DO blocks and IF NOT EXISTS guards

-- 1) Base table
create table if not exists public.gallery_settings (
  id integer primary key default 1,
  scroll_per_item integer not null default 650,
  distance integer not null default 1400,
  background_blur_px integer not null default 100,
  card_blur_max integer not null default 8,
  updated_at timestamp with time zone default now()
);

-- 2) Ensure singleton row exists
insert into public.gallery_settings (id)
  values (1)
  on conflict (id) do nothing;

-- 3) RLS
alter table public.gallery_settings enable row level security;

-- 4) Policies (idempotent via pg_policies)
-- Read
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'gallery_settings'
      and policyname = 'gallery_settings_read'
  ) then
    create policy gallery_settings_read
      on public.gallery_settings for select
      to anon, authenticated
      using (true);
  end if;
end$$;

-- Update (singleton row only)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'gallery_settings'
      and policyname = 'gallery_settings_update'
  ) then
    create policy gallery_settings_update
      on public.gallery_settings for update
      to authenticated
      using (id = 1)
      with check (id = 1);
  end if;
end$$;

-- 5) Reveal columns
alter table if exists public.gallery_settings
  add column if not exists reveal_enabled boolean not null default true;

alter table if exists public.gallery_settings
  add column if not exists reveal_duration_ms integer not null default 800;

do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'gallery_settings' and column_name = 'reveal_orientation'
  ) then
    alter table public.gallery_settings add column reveal_orientation text not null default 'horizontal' check (reveal_orientation in ('horizontal','vertical'));
  end if;
end $$;

-- 6) Ensure row id=1 has reveal values
insert into public.gallery_settings (id)
values (1)
on conflict (id) do update set
  reveal_enabled = coalesce(public.gallery_settings.reveal_enabled, true),
  reveal_duration_ms = coalesce(public.gallery_settings.reveal_duration_ms, 800),
  reveal_orientation = coalesce(public.gallery_settings.reveal_orientation, 'horizontal');
