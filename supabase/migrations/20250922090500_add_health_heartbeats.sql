-- Create health_heartbeats table for Netlify heartbeat diagnostics
do $$ begin
  if not exists (
    select 1 from information_schema.tables where table_schema='public' and table_name='health_heartbeats'
  ) then
    create table public.health_heartbeats (
      id integer primary key,
      last_run timestamptz,
      updated_by text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  end if;
end $$;

-- Trigger to auto-update updated_at
do $$ begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on p.pronamespace = n.oid
    where p.proname = 'set_updated_at' and n.nspname='public'
  ) then
    create or replace function public.set_updated_at()
    returns trigger as $fn$
    begin
      new.updated_at = now();
      return new;
    end;
    $fn$ language plpgsql;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger t join pg_class c on t.tgrelid=c.oid join pg_namespace n on c.relnamespace=n.oid
    where t.tgname='health_heartbeats_set_updated_at' and n.nspname='public' and c.relname='health_heartbeats'
  ) then
    create trigger health_heartbeats_set_updated_at
    before update on public.health_heartbeats
    for each row execute function public.set_updated_at();
  end if;
end $$;

-- Enable RLS and basic policies
alter table public.health_heartbeats enable row level security;

-- Read policy (authenticated users can read). Relax to 'using (true)' if anonymous read is okay.
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='health_heartbeats' and policyname='read_health_heartbeats'
  ) then
    create policy read_health_heartbeats on public.health_heartbeats
    for select using (auth.role() = 'authenticated' or (select current_setting('request.jwt.claims', true)) is null);
  end if;
end $$;

-- Upsert seed row id=1 so UI can read something immediately
insert into public.health_heartbeats (id, last_run, updated_by)
values (1, now(), 'migration-seed')
on conflict (id) do update set last_run = excluded.last_run, updated_by = excluded.updated_by;
