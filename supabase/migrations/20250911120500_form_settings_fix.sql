-- Ensure form_settings row and correct RLS policies/grants so admin updates work

-- 1) Ensure singleton row exists
insert into public.form_settings (id)
values (1)
on conflict (id) do nothing;

-- 2) Ensure RLS is enabled
alter table public.form_settings enable row level security;

-- 3) Reset policies idempotently and recreate
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'form_settings' AND policyname = 'Allow public read access to form_settings'
  ) THEN
    EXECUTE 'DROP POLICY "Allow public read access to form_settings" ON public.form_settings';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'form_settings' AND policyname = 'Allow authenticated users to update form_settings'
  ) THEN
    EXECUTE 'DROP POLICY "Allow authenticated users to update form_settings" ON public.form_settings';
  END IF;
END $$;

create policy "Allow public read access to form_settings"
  on public.form_settings
  for select
  to anon, authenticated
  using (true);

create policy "Allow authenticated users to update form_settings"
  on public.form_settings
  for update
  to authenticated
  using (true)
  with check (true);

-- 4) Grants complementing RLS
grant usage on schema public to anon, authenticated;
grant select on table public.form_settings to anon, authenticated;
grant update on table public.form_settings to authenticated;
