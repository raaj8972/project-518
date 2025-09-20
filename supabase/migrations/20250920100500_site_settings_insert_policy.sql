-- Allow INSERT on site_settings for admins (fix upsert RLS error)

-- Context:
--  - We already allow SELECT for everyone (public gating) and UPDATE for authenticated admins via public.is_admin().
--  - The UI performs an upsert(id=1, ...). If the singleton row was never created or was deleted, the upsert
--    becomes an INSERT, which previously violated RLS because no INSERT policy existed.
--
-- Change:
--  - Add an INSERT policy restricted to authenticated users who are admins (public.is_admin()).

do $$ begin
  perform 1 from pg_tables where schemaname='public' and tablename='site_settings';
exception when others then null; end $$;

-- Ensure RLS is enabled (safe if already enabled)
do $$ begin
  execute 'alter table public.site_settings enable row level security';
exception when others then null; end $$;

-- Create/replace INSERT policy
drop policy if exists site_settings_insert on public.site_settings;
create policy site_settings_insert on public.site_settings
for insert to authenticated
with check (public.is_admin());

-- Keep existing policies (select/update) as defined in earlier migrations.

-- Ask PostgREST to reload policies
do $$ begin
  perform pg_notify('pgrst', 'reload schema');
exception when others then null; end $$;
