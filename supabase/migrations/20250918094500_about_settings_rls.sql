-- Enable RLS and policies for public.about_settings (idempotent)

-- Ensure table exists before applying RLS/policies
do $$ begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'about_settings'
  ) then
    -- Enable RLS
    execute 'alter table public.about_settings enable row level security';

    -- Public read policy (anon + authenticated)
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'about_settings' and policyname = 'about_settings_read'
    ) then
      create policy about_settings_read
        on public.about_settings for select
        to anon, authenticated
        using (true);
    end if;

    -- Update policy for authenticated users only for singleton row id=1
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'about_settings' and policyname = 'about_settings_update'
    ) then
      create policy about_settings_update
        on public.about_settings for update
        to authenticated
        using (id = 1)
        with check (id = 1);
    end if;

    -- Insert policy for singleton row (id=1) by authenticated users
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'about_settings' and policyname = 'about_settings_insert'
    ) then
      create policy about_settings_insert
        on public.about_settings for insert
        to authenticated
        with check (id = 1);
    end if;
  end if;
end $$;
