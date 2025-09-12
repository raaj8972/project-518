-- Guest Artists video support: columns + storage bucket + policies (idempotent)

-- 1) Columns for uploaded video and YouTube URL
alter table public.guest_artists
  add column if not exists video_url text,
  add column if not exists youtube_url text;

-- 2) Ensure RLS is enabled and policies exist (read for all, modify for authenticated)
alter table public.guest_artists enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'guest_artists' and policyname = 'guest_artists_select'
  ) then
    create policy "guest_artists_select" on public.guest_artists for select using ( true );
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'guest_artists' and policyname = 'guest_artists_modify'
  ) then
    create policy "guest_artists_modify" on public.guest_artists
      for all using ( auth.role() = 'authenticated' )
      with check ( auth.role() = 'authenticated' );
  end if;
end$$;

-- 3) Storage bucket for videos with public read and authenticated write
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('guest-artist-videos','guest-artist-videos', true, 83886080,  -- 80MB
  array['video/mp4','video/quicktime','video/webm','image/png','image/jpeg','image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Drop/recreate policies idempotently
do $$ begin
  if exists (select 1 from pg_policies where policyname = 'Public read guest-artist-videos') then
    drop policy "Public read guest-artist-videos" on storage.objects;
  end if;
  if exists (select 1 from pg_policies where policyname = 'Auth insert guest-artist-videos') then
    drop policy "Auth insert guest-artist-videos" on storage.objects;
  end if;
  if exists (select 1 from pg_policies where policyname = 'Auth update guest-artist-videos') then
    drop policy "Auth update guest-artist-videos" on storage.objects;
  end if;
  if exists (select 1 from pg_policies where policyname = 'Auth delete guest-artist-videos') then
    drop policy "Auth delete guest-artist-videos" on storage.objects;
  end if;
end $$;

create policy "Public read guest-artist-videos" on storage.objects for select to public using (bucket_id = 'guest-artist-videos');
create policy "Auth insert guest-artist-videos" on storage.objects for insert to authenticated with check (bucket_id = 'guest-artist-videos');
create policy "Auth update guest-artist-videos" on storage.objects for update to authenticated using (bucket_id = 'guest-artist-videos') with check (bucket_id = 'guest-artist-videos');
create policy "Auth delete guest-artist-videos" on storage.objects for delete to authenticated using (bucket_id = 'guest-artist-videos');
