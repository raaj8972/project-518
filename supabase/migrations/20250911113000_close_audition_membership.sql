-- Close auditions and memberships via form_settings flags and RLS-aware policies

-- 1) Ensure form_settings row exists, then disable both forms
insert into public.form_settings (id)
values (1)
on conflict (id) do nothing;

update public.form_settings
set audition_form_enabled = false,
    membership_form_enabled = false,
    updated_at = now()
where id = 1;

-- 2) Gate public inserts into auditions/memberships based on form_settings flags
-- Drop existing permissive insert policies if present and recreate with checks
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'auditions' AND policyname = 'Allow public to create auditions'
  ) THEN
    EXECUTE 'DROP POLICY "Allow public to create auditions" ON public.auditions';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'memberships' AND policyname = 'Allow public to create memberships'
  ) THEN
    EXECUTE 'DROP POLICY "Allow public to create memberships" ON public.memberships';
  END IF;
END $$;

-- Recreate with a WITH CHECK that consults form_settings flags
create policy "Allow public to create auditions"
  on public.auditions
  for insert
  to anon, authenticated
  with check (
    (select audition_form_enabled from public.form_settings where id = 1) = true
  );

create policy "Allow public to create memberships"
  on public.memberships
  for insert
  to anon, authenticated
  with check (
    (select membership_form_enabled from public.form_settings where id = 1) = true
  );

-- Note: Reads/updates/deletes policies unchanged
