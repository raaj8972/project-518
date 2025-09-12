-- Adds reveal controls to gallery_settings
-- Safe to run multiple times using IF NOT EXISTS guards where possible

-- Ensure base table exists in case previous migration hasn't run yet
create table if not exists public.gallery_settings (
  id integer primary key default 1,
  scroll_per_item integer not null default 650,
  distance integer not null default 1400,
  background_blur_px integer not null default 100,
  card_blur_max integer not null default 8,
  updated_at timestamp with time zone default now()
);

-- Add boolean flag to enable/disable click reveal overlay
alter table if exists public.gallery_settings
  add column if not exists reveal_enabled boolean not null default true;

-- Add configurable duration for reveal animation (ms)
alter table if exists public.gallery_settings
  add column if not exists reveal_duration_ms integer not null default 800;

-- Orientation for reveal eye animation: 'horizontal' or 'vertical'
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'gallery_settings' and column_name = 'reveal_orientation'
  ) then
    alter table public.gallery_settings add column reveal_orientation text not null default 'horizontal' check (reveal_orientation in ('horizontal','vertical'));
  end if;
end $$;

-- Ensure singleton row has values
insert into public.gallery_settings (id)
values (1)
on conflict (id) do update set
  reveal_enabled = coalesce(public.gallery_settings.reveal_enabled, true),
  reveal_duration_ms = coalesce(public.gallery_settings.reveal_duration_ms, 800),
  reveal_orientation = coalesce(public.gallery_settings.reveal_orientation, 'horizontal');
