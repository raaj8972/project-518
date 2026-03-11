-- Create the storage bucket for registration photos
insert into storage.buckets (id, name, public)
values ('registration-photos', 'registration-photos', true)
on conflict (id) do nothing;

-- Drop existing policies if they exist (to allow re-running without errors)
drop policy if exists "Allow public read access for registration-photos" on storage.objects;
drop policy if exists "Allow authenticatd upload to registration-photos" on storage.objects;
drop policy if exists "Allow anonymous upload to registration-photos" on storage.objects;
drop policy if exists "Allow authenticated delete from registration-photos" on storage.objects;

-- Allow public read access (everyone can see the photos)
create policy "Allow public read access for registration-photos"
on storage.objects for select
to public
using ( bucket_id = 'registration-photos' );

-- Allow the anonymous user to upload photos (for the public registration form)
create policy "Allow anonymous upload to registration-photos"
on storage.objects for insert
to anon
with check ( bucket_id = 'registration-photos' );

-- Allow authenticated users (Admins) to upload and delete photos
create policy "Allow authenticatd upload to registration-photos"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'registration-photos' );

create policy "Allow authenticated delete from registration-photos"
on storage.objects for delete
to authenticated
using ( bucket_id = 'registration-photos' );
