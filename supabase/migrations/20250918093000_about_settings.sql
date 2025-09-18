-- Create about_settings table to power the editable About section
-- Idempotent: check existence before creating
do $$ begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'about_settings'
  ) then
    create table public.about_settings (
      id integer primary key,
      enabled boolean not null default true,
      hero_title text,
      hero_heading text,
      hero_paragraphs jsonb not null default '[]'::jsonb,
      tracks jsonb not null default '[]'::jsonb,
      zones jsonb not null default '[]'::jsonb,
      stats jsonb not null default '[]'::jsonb,
      updated_at timestamptz not null default now()
    );

    -- Seed singleton row (id=1)
    insert into public.about_settings (id, enabled, hero_title, hero_heading, hero_paragraphs, tracks, zones, stats)
    values (
      1,
      true,
      'ABOUT RICORRENZA',
      'THE FUTURE IS NOW',
      to_jsonb(array[
        'RICORRENZA 2025 is not just a festival—it''s a revolution that merges the boundaries between healthcare innovation, cutting-edge technology, and creative expression.',
        'Born from the vision of creating a platform where digital dreams meet reality, RICORRENZA has evolved into the most anticipated festival experience, attracting visionaries, innovators, and creators from across the digital landscape.',
        'Our festival celebrates the convergence of disciplines—where medical students become tech innovators, where artists code their creativity, and where the future of human potential is explored through immersive experiences.'
      ]),
      to_jsonb(array['Healthcare Technology','Digital Arts & Media','Music','Interactive Experiences']),
      to_jsonb(array['Virtual Reality Labs','AI Demonstration Pods','Art Galleries','Future Tech Showcases']),
      to_jsonb(array[
        jsonb_build_object('value','2025','label','FESTIVAL YEAR'),
        jsonb_build_object('value','3+','label','DAYS OF EVENTS'),
        jsonb_build_object('value','1000+','label','PARTICIPANTS'),
        jsonb_build_object('value','∞','label','POSSIBILITIES')
      ])
    )
    on conflict (id) do nothing;
  end if;
end $$;

-- Touch updated_at on update
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_about_settings_set_updated_at'
  ) then
    create trigger trg_about_settings_set_updated_at
    before update on public.about_settings
    for each row execute function public.set_updated_at();
  end if;
end $$;
