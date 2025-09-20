-- Ensure roadmap_milestones is readable anonymously and modifiable by authenticated users
-- Safe to run multiple times

-- Table exists check is handled by IF NOT EXISTS here so repeated runs are safe
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

create index if not exists roadmap_milestones_order_idx on public.roadmap_milestones(order_position);
create index if not exists roadmap_milestones_year_idx on public.roadmap_milestones(year);

-- Updated at trigger function
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_roadmap_milestones_updated on public.roadmap_milestones;
create trigger trg_roadmap_milestones_updated
before update on public.roadmap_milestones
for each row execute function public.set_updated_at();

alter table public.roadmap_milestones enable row level security;

-- Policies: anonymous SELECT, authenticated ALL
-- Drop if exists then create to avoid IF NOT EXISTS syntax issues
drop policy if exists "roadmap_milestones_select" on public.roadmap_milestones;
create policy "roadmap_milestones_select" on public.roadmap_milestones
  for select using ( true );

drop policy if exists "roadmap_milestones_modify" on public.roadmap_milestones;
create policy "roadmap_milestones_modify" on public.roadmap_milestones
  for all using ( auth.role() = 'authenticated' )
  with check ( auth.role() = 'authenticated' );
