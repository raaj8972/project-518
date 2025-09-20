-- Enforce that only Owner or admins with can_events may modify events
do $$ begin
  perform 1 from pg_tables where schemaname='public' and tablename='events';
exception when others then null; end $$;

alter table if exists public.events enable row level security;

-- Select policy remains open to public (site content), if you previously had a policy; otherwise allow all select
drop policy if exists events_select_all on public.events;
create policy events_select_all on public.events
for select using (true);

-- Insert/Update/Delete require owner or events permission
drop policy if exists events_modify on public.events;
create policy events_modify on public.events
for all to authenticated
using (public.has_permission('events'))
with check (public.has_permission('events'));

-- Reload schema
do $$ begin perform pg_notify('pgrst', 'reload schema'); exception when others then null; end $$;
