-- Enable Row Level Security and policies for select/write on selected public tables
-- Date: 2025-09-23

-- NOTE on wrappers_fdw_stats:
--   The table/view public.wrappers_fdw_stats is typically created by an extension
--   for internal statistics. We intentionally do NOT enable RLS on it to avoid
--   breaking its intended behavior. If Studio warns about it, it can be safely ignored
--   or moved to a dedicated schema. Do not add RLS to system/extension-managed relations.

-- ============================================================================
-- social_media_settings
-- Public should be able to read, but only admins should write.
-- Admin check is based on presence of a row in admin_permissions for auth.uid().
-- You may tailor the permission flag as desired; we use a broad OR of flags
-- that correspond to top-level site management responsibilities.
-- ============================================================================

alter table if exists public.social_media_settings enable row level security;

-- Allow everyone (anon/auth) to SELECT
create policy if not exists "social_media_settings_public_select"
  on public.social_media_settings
  for select
  using (true);

-- Allow authenticated admins to UPDATE the singleton row (id = 1)
create policy if not exists "social_media_settings_admin_update"
  on public.social_media_settings
  for update
  to authenticated
  using (
    id = 1
    and exists (
      select 1 from public.admin_permissions p
      where p.user_id = auth.uid()
        and (
          coalesce(p.can_events, false)
          or coalesce(p.can_gallery, false)
          or coalesce(p.can_sponsors, false)
          or coalesce(p.can_homebound, false)
        )
    )
  )
  with check (
    id = 1
    and exists (
      select 1 from public.admin_permissions p
      where p.user_id = auth.uid()
        and (
          coalesce(p.can_events, false)
          or coalesce(p.can_gallery, false)
          or coalesce(p.can_sponsors, false)
          or coalesce(p.can_homebound, false)
        )
    )
  );

-- Allow authenticated admins to INSERT the singleton row if missing (id = 1)
create policy if not exists "social_media_settings_admin_insert"
  on public.social_media_settings
  for insert
  to authenticated
  with check (
    id = 1
    and exists (
      select 1 from public.admin_permissions p
      where p.user_id = auth.uid()
        and (
          coalesce(p.can_events, false)
          or coalesce(p.can_gallery, false)
          or coalesce(p.can_sponsors, false)
          or coalesce(p.can_homebound, false)
        )
    )
  );

-- Optionally prevent deletes for safety (no policy -> no delete). If you want admin delete, add a policy here.

-- ============================================================================
-- event_coordinators
-- Public read; only admins with events permission can write.
-- ============================================================================

alter table if exists public.event_coordinators enable row level security;

create policy if not exists "event_coordinators_public_select"
  on public.event_coordinators
  for select
  using (true);

create policy if not exists "event_coordinators_admin_write"
  on public.event_coordinators
  for all
  to authenticated
  using (
    exists (
      select 1 from public.admin_permissions p
      where p.user_id = auth.uid()
        and coalesce(p.can_events, false)
    )
  )
  with check (
    exists (
      select 1 from public.admin_permissions p
      where p.user_id = auth.uid()
        and coalesce(p.can_events, false)
    )
  );

-- Done.
