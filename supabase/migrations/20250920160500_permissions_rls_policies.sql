-- Apply/align RLS policies for multiple sections using has_permission()

-- Helper: enable RLS if not enabled, safe to run repeatedly
do $$ begin
  begin alter table public.schedule_days enable row level security; exception when others then null; end;
  begin alter table public.schedule_events enable row level security; exception when others then null; end;
  begin alter table public.gallery_images enable row level security; exception when others then null; end;
  begin alter table public.sponsors enable row level security; exception when others then null; end;
  begin alter table public.registrations enable row level security; exception when others then null; end;
  begin alter table public.faculty_heads enable row level security; exception when others then null; end;
  begin alter table public.core_committees enable row level security; exception when others then null; end;
  begin alter table public.core_team_members enable row level security; exception when others then null; end;
  begin alter table public.guest_artists enable row level security; exception when others then null; end;
  begin alter table public.chief_guests enable row level security; exception when others then null; end;
  begin alter table public.homebound_settings enable row level security; exception when others then null; end;
  begin alter table public.sponsorship_settings enable row level security; exception when others then null; end;
  begin alter table public.sponsorship_packages enable row level security; exception when others then null; end;
end $$;

-- Public read policies (if they don't already exist). For brevity, allow select to all; adjust if needed.
-- Public SELECT policies (idempotent)
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='gallery_images' and policyname='sel_gallery') then
    create policy sel_gallery on public.gallery_images for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sponsors' and policyname='sel_sponsors') then
    create policy sel_sponsors on public.sponsors for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='schedule_days' and policyname='sel_schedule_days') then
    create policy sel_schedule_days on public.schedule_days for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='schedule_events' and policyname='sel_schedule_events') then
    create policy sel_schedule_events on public.schedule_events for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='registrations' and policyname='sel_registrations') then
    create policy sel_registrations on public.registrations for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='faculty_heads' and policyname='sel_faculty_heads') then
    create policy sel_faculty_heads on public.faculty_heads for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='core_committees' and policyname='sel_core_committees') then
    create policy sel_core_committees on public.core_committees for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='core_team_members' and policyname='sel_core_team_members') then
    create policy sel_core_team_members on public.core_team_members for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='guest_artists' and policyname='sel_guest_artists') then
    create policy sel_guest_artists on public.guest_artists for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='chief_guests' and policyname='sel_chief_guests') then
    create policy sel_chief_guests on public.chief_guests for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='homebound_settings' and policyname='sel_homebound_settings') then
    create policy sel_homebound_settings on public.homebound_settings for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sponsorship_settings' and policyname='sel_sponsorship_settings') then
    create policy sel_sponsorship_settings on public.sponsorship_settings for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sponsorship_packages' and policyname='sel_sponsorship_packages') then
    create policy sel_sponsorship_packages on public.sponsorship_packages for select using (true);
  end if;
end $$;

-- Modify policies
-- Modify (ALL) policies (idempotent)
do $$ begin
  -- Schedule
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='schedule_days' and policyname='mod_schedule_days') then
    create policy mod_schedule_days on public.schedule_days for all using (public.is_owner() or public.has_permission('schedule')) with check (public.is_owner() or public.has_permission('schedule'));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='schedule_events' and policyname='mod_schedule_events') then
    create policy mod_schedule_events on public.schedule_events for all using (public.is_owner() or public.has_permission('schedule')) with check (public.is_owner() or public.has_permission('schedule'));
  end if;

  -- Gallery
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='gallery_images' and policyname='mod_gallery_images') then
    create policy mod_gallery_images on public.gallery_images for all using (public.is_owner() or public.has_permission('gallery')) with check (public.is_owner() or public.has_permission('gallery'));
  end if;

  -- Sponsors
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sponsors' and policyname='mod_sponsors') then
    create policy mod_sponsors on public.sponsors for all using (public.is_owner() or public.has_permission('sponsors')) with check (public.is_owner() or public.has_permission('sponsors'));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sponsorship_settings' and policyname='mod_sponsorship_settings') then
    create policy mod_sponsorship_settings on public.sponsorship_settings for all using (public.is_owner() or public.has_permission('sponsors')) with check (public.is_owner() or public.has_permission('sponsors'));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sponsorship_packages' and policyname='mod_sponsorship_packages') then
    create policy mod_sponsorship_packages on public.sponsorship_packages for all using (public.is_owner() or public.has_permission('sponsors')) with check (public.is_owner() or public.has_permission('sponsors'));
  end if;

  -- Registrations
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='registrations' and policyname='mod_registrations') then
    create policy mod_registrations on public.registrations for all using (public.is_owner() or public.has_permission('registrations')) with check (public.is_owner() or public.has_permission('registrations'));
  end if;

  -- Faculty / Core team
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='faculty_heads' and policyname='mod_faculty_heads') then
    create policy mod_faculty_heads on public.faculty_heads for all using (public.is_owner() or public.has_permission('faculty')) with check (public.is_owner() or public.has_permission('faculty'));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='core_committees' and policyname='mod_core_committees') then
    create policy mod_core_committees on public.core_committees for all using (public.is_owner() or public.has_permission('core_team')) with check (public.is_owner() or public.has_permission('core_team'));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='core_team_members' and policyname='mod_core_team_members') then
    create policy mod_core_team_members on public.core_team_members for all using (public.is_owner() or public.has_permission('core_team')) with check (public.is_owner() or public.has_permission('core_team'));
  end if;

  -- Artists
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='guest_artists' and policyname='mod_guest_artists') then
    create policy mod_guest_artists on public.guest_artists for all using (public.is_owner() or public.has_permission('guest_artists')) with check (public.is_owner() or public.has_permission('guest_artists'));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='chief_guests' and policyname='mod_chief_guests') then
    create policy mod_chief_guests on public.chief_guests for all using (public.is_owner() or public.has_permission('chief_guests')) with check (public.is_owner() or public.has_permission('chief_guests'));
  end if;

  -- Homebound
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='homebound_settings' and policyname='mod_homebound_settings') then
    create policy mod_homebound_settings on public.homebound_settings for all using (public.is_owner() or public.has_permission('homebound')) with check (public.is_owner() or public.has_permission('homebound'));
  end if;
end $$;

-- Note: Registration Photos are stored in Storage. Bucket-level RLS isn't managed here; access is via Supabase Storage policies.
-- If you use a SQL view/table referencing storage.objects, add similar policies accordingly.

-- Notify PostgREST to pick up policy changes
do $$ begin perform pg_notify('pgrst', 'reload schema'); exception when others then null; end $$;
