/*
  # Create 'pdf' storage bucket for brochures and documents

  - Public read access
  - Authenticated users can upload/update/delete
*/

-- Create the 'pdf' bucket if it does not exist
insert into storage.buckets (id, name, public)
values ('pdf', 'pdf', true)
on conflict (id) do nothing;

-- Public can read files from 'pdf'
create policy if not exists "Public read access for pdf"
  on storage.objects for select
  to public
  using (bucket_id = 'pdf');

-- Authenticated can upload to 'pdf'
create policy if not exists "Authenticated upload to pdf"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'pdf');

-- Authenticated can update files in 'pdf'
create policy if not exists "Authenticated update pdf"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'pdf');

-- Authenticated can delete files from 'pdf'
create policy if not exists "Authenticated delete from pdf"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'pdf');
