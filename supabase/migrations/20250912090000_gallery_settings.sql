-- gallery_settings: singleton configuration for Gallery page animation
create table if not exists public.gallery_settings (
  id integer primary key default 1,
  scroll_per_item integer not null default 650,
  distance integer not null default 1400,
  background_blur_px integer not null default 100,
  card_blur_max integer not null default 8,
  updated_at timestamp with time zone default now()
);

-- Ensure a singleton row exists
insert into public.gallery_settings (id)
  values (1)
  on conflict (id) do nothing;

-- RLS
alter table public.gallery_settings enable row level security;

-- Allow anyone to read settings (idempotent)
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

-- Allow authenticated users to update the singleton row (idempotent)
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
