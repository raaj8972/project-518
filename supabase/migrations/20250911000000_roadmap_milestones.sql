-- Roadmap milestones table
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

-- Keep order_position unique-ish (soft) per year ordering
create index if not exists roadmap_milestones_order_idx on public.roadmap_milestones(order_position);
create index if not exists roadmap_milestones_year_idx on public.roadmap_milestones(year);

-- Updated at trigger
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

-- RLS
alter table public.roadmap_milestones enable row level security;

-- Policies (adjust auth schema/roles as needed)
-- Allow read to everyone
create policy "roadmap_milestones_select" on public.roadmap_milestones
for select using ( true );

-- Allow authenticated users to manage (you can refine with auth.uid() = created_by if you add created_by column)
create policy "roadmap_milestones_modify" on public.roadmap_milestones
for all using ( auth.role() = 'authenticated' ) with check ( auth.role() = 'authenticated' );

-- Sample seed data
insert into public.roadmap_milestones (year, title, points, order_position, enabled, side) values
  (2015, 'Commencement of Ricorrenza', array['Commencement of Ricorrenza'], 1, true, 'right'),
  (2017, 'Growth Phase', array['20+ events','500+ participants','3 days of cultural extravaganza'], 2, true, 'left'),
  (2019, 'National Recognition', array['Bollywood Artist Mohammad Irfan','Bengals Favourite Anupam Roy','Waves in Town Band','10000+ Footfall'], 3, true, 'right'),
  (2022, 'Expansion', array['Develop branding & marketing campaigns','1000+ Footfall','DJ Night','Guest Artists'], 4, true, 'auto'),
  (2023, 'Artist Spotlight', array['Bollywood Artist Amit Mishra','Ehsaas India Band','DJ Nights','College Band Homeground'], 5, true, 'right'),
  (2025, 'Future Vision', array['Radiant Glow Bands','National Artists','Indo Western Band','Biggest ever in History of RICORRENZA'], 6, true, 'left')
  on conflict do nothing;
