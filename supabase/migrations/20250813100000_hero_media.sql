-- Create a table to manage hero media for each page and a public storage bucket
-- Pages covered: home, events, schedule, gallery, homebound, ricofamily, sponsors

create table if not exists public.hero_media (
  id bigserial primary key,
  page_key text not null unique check (page_key in ('home','events','schedule','gallery','homebound','ricofamily','sponsors')),
  background_type text not null default 'auto' check (background_type in ('image','video','auto')),
  image_url text,
  video_url text,
  poster_url text,
  overlay_color text default '#000000',
  overlay_opacity numeric not null default 0.35 check (overlay_opacity >= 0 and overlay_opacity <= 1),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at current
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;$$;

drop trigger if exists trg_hero_media_updated_at on public.hero_media;
create trigger trg_hero_media_updated_at
before update on public.hero_media
for each row execute function public.set_updated_at();

-- RLS
alter table public.hero_media enable row level security;

-- Read for everyone
drop policy if exists "hero_media_read_all" on public.hero_media;
create policy "hero_media_read_all" on public.hero_media
for select using (true);

-- Modify for authenticated
drop policy if exists "hero_media_modify_auth" on public.hero_media;
create policy "hero_media_modify_auth" on public.hero_media
for all to authenticated using (true) with check (true);

-- Seed rows for each page if missing
insert into public.hero_media (page_key) values
  ('home'),('events'),('schedule'),('gallery'),('homebound'),('ricofamily'),('sponsors')
on conflict (page_key) do nothing;

-- STORAGE: create a public bucket for hero media
-- Requires postgres function storage.create_bucket
select
  case when not exists (select 1 from storage.buckets where id = 'hero-media')
    then storage.create_bucket('hero-media', public := true)
  end;

-- Storage RLS policies
-- Public read
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public read hero-media'
  ) then
    create policy "Public read hero-media" on storage.objects
      for select
      using (bucket_id = 'hero-media');
  end if;
end $$;

-- Authenticated create/update/delete
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Auth write hero-media'
  ) then
    create policy "Auth write hero-media" on storage.objects
      for all to authenticated
      using (bucket_id = 'hero-media')
      with check (bucket_id = 'hero-media');
  end if;
end $$;

-- Ensure anon can list objects (optional)
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Anon list hero-media'
  ) then
    create policy "Anon list hero-media" on storage.objects
      for select to anon
      using (bucket_id = 'hero-media');
  end if;
end $$;

-- Reload PostgREST schema if needed
notify pgrst, 'reload schema';
