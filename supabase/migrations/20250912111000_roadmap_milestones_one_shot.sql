-- One-shot, idempotent setup for public.roadmap_milestones
-- Safe to run multiple times

-- 1) Table
create table if not exists public.roadmap_milestones (
  id bigserial primary key,
  year int not null,
  title text,
  points text[] default '{}',
  order_position int not null default 0,
  enabled boolean not null default true,
  side text not null default 'auto' check (side in ('auto','left','right')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Indexes
create index if not exists roadmap_milestones_order_idx on public.roadmap_milestones(order_position);
create index if not exists roadmap_milestones_year_idx on public.roadmap_milestones(year);

-- 3) updated_at trigger function
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 4) Trigger
drop trigger if exists trg_roadmap_milestones_updated on public.roadmap_milestones;
create trigger trg_roadmap_milestones_updated
before update on public.roadmap_milestones
for each row execute function public.set_updated_at();

-- 5) RLS and Policies
alter table public.roadmap_milestones enable row level security;

-- Allow read for everyone
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'roadmap_milestones'
      and policyname = 'roadmap_milestones_select'
  ) then
    create policy "roadmap_milestones_select" on public.roadmap_milestones
      for select using ( true );
  end if;
end$$;

-- Allow authenticated users to modify
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'roadmap_milestones'
      and policyname = 'roadmap_milestones_modify'
  ) then
    create policy "roadmap_milestones_modify" on public.roadmap_milestones
      for all using ( auth.role() = 'authenticated' )
      with check ( auth.role() = 'authenticated' );
  end if;
end$$;

-- (Optional) Seed data can be inserted separately to avoid duplication in one-shot scripts
