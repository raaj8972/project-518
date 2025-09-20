-- Storage policies for private bucket registration-photos
-- Allow read/write only to Owner or admins with can_registration_photos

-- Create policies on storage.objects for bucket 'registration-photos' (idempotent)
do $$ begin
  -- Select (list/read metadata) policy
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'sel_reg_photos'
  ) then
    create policy sel_reg_photos on storage.objects
      for select
      using (
        bucket_id = 'registration-photos'
        and (public.is_owner() or public.has_permission('registration_photos'))
      );
  end if;

  -- Insert (upload) policy
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'ins_reg_photos'
  ) then
    create policy ins_reg_photos on storage.objects
      for insert
      with check (
        bucket_id = 'registration-photos'
        and (public.is_owner() or public.has_permission('registration_photos'))
      );
  end if;

  -- Update (move/rename) policy
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'upd_reg_photos'
  ) then
    create policy upd_reg_photos on storage.objects
      for update
      using (
        bucket_id = 'registration-photos'
        and (public.is_owner() or public.has_permission('registration_photos'))
      )
      with check (
        bucket_id = 'registration-photos'
        and (public.is_owner() or public.has_permission('registration_photos'))
      );
  end if;

  -- Delete policy
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'del_reg_photos'
  ) then
    create policy del_reg_photos on storage.objects
      for delete
      using (
        bucket_id = 'registration-photos'
        and (public.is_owner() or public.has_permission('registration_photos'))
      );
  end if;
end $$;

-- Note: Ensure the bucket exists and is set to private in the Storage settings.
