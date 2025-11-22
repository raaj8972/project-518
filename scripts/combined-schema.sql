-- combined-schema.sql: concatenated migration files
-- Generated on: 2025-11-22T11:02:52Z


-- FILE: migrations/20250930_add_is_council.sql

-- Migration: add is_council boolean to core_team_members
-- Created: 2025-09-30
-- Safe, idempotent migration; run in Supabase SQL editor or via psql.

-- 1) Add new boolean column to hold council flag (safe default = false)
ALTER TABLE public.core_team_members
  ADD COLUMN IF NOT EXISTS is_council boolean DEFAULT false;

-- 2) Optional backfill: explicitly set current NULLs to false
UPDATE public.core_team_members
SET is_council = false
WHERE is_council IS NULL;

-- 3) Create an index to support queries / ordering / filtering on this column
-- If you prefer to avoid locks on a busy table, run CREATE INDEX CONCURRENTLY separately.
CREATE INDEX IF NOT EXISTS idx_core_team_members_is_council
  ON public.core_team_members (is_council);

-- 4) Example backfill: mark specific members as council by id (edit ids as required)
-- UPDATE public.core_team_members
-- SET is_council = true
-- WHERE id IN (3,7);

-- 4b) Alternative bulk backfill using committee link - this block is safe but will only run if a matching FK/text column exists.
DO $$
BEGIN
  -- If a foreign key column exists, try both common names
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'core_team_members'
      AND column_name = 'core_committee_id'
  ) THEN
  RAISE NOTICE 'Backfilling is_council using core_committee_id -> core_committees.name ILIKE ''%%council%%''';
    EXECUTE $q$
      UPDATE public.core_team_members m
      SET is_council = true
      FROM public.core_committees c
      WHERE m.core_committee_id = c.id
        AND c.name ILIKE '%council%';
    $q$;

  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'core_team_members'
      AND column_name = 'committee_id'
  ) THEN
  RAISE NOTICE 'Backfilling is_council using committee_id -> core_committees.name ILIKE ''%%council%%''';
    EXECUTE $q$
      UPDATE public.core_team_members m
      SET is_council = true
      FROM public.core_committees c
      WHERE m.committee_id = c.id
        AND c.name ILIKE '%council%';
    $q$;

  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'core_team_members'
      AND column_name = 'core_committee'
  ) THEN
  RAISE NOTICE 'Backfilling is_council using core_committee (text) -> comparing to core_committees.name ILIKE ''%%council%%''';
    EXECUTE $q$
      UPDATE public.core_team_members m
      SET is_council = true
      FROM public.core_committees c
      WHERE m.core_committee ILIKE c.name
        AND c.name ILIKE '%council%';
    $q$;

  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'core_team_members'
      AND column_name = 'committee'
  ) THEN
  RAISE NOTICE 'Backfilling is_council using committee (text) -> comparing to core_committees.name ILIKE ''%%council%%''';
    EXECUTE $q$
      UPDATE public.core_team_members m
      SET is_council = true
      FROM public.core_committees c
      WHERE m.committee ILIKE c.name
        AND c.name ILIKE '%council%';
    $q$;

  ELSE
    RAISE NOTICE 'No recognized committee FK/name column found in core_team_members; skipping automated backfill.';
  END IF;
END
$$ LANGUAGE plpgsql;

-- 5) Ensure default and (optionally) enforce NOT NULL.
ALTER TABLE public.core_team_members
  ALTER COLUMN is_council SET DEFAULT false;

-- Only run the following once you're sure there are no NULLs (see step 2):
-- ALTER TABLE public.core_team_members
--   ALTER COLUMN is_council SET NOT NULL;

-- 6) Idempotent RLS policy creation using DO blocks (Postgres doesn't support CREATE POLICY IF NOT EXISTS)
-- Optional: enable row level security only if you intend to manage policies.
-- Be careful: enabling RLS without suitable policies may block access for your app.
-- ALTER TABLE public.core_team_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies p
    WHERE p.policyname = 'allow_admins_select_core_team_members'
      AND p.schemaname = 'public'
      AND p.tablename = 'core_team_members'
  ) THEN
    EXECUTE $q$
      CREATE POLICY "allow_admins_select_core_team_members"
        ON public.core_team_members
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.admin_users au
            WHERE au.user_id = auth.uid()
              AND (au.role = 'owner' OR au.role = 'admin')
          )
        );
    $q$;
  END IF;
END
$$ LANGUAGE plpgsql;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies p
    WHERE p.policyname = 'allow_admins_update_is_council'
      AND p.schemaname = 'public'
      AND p.tablename = 'core_team_members'
  ) THEN
    EXECUTE $q$
      CREATE POLICY "allow_admins_update_is_council"
        ON public.core_team_members
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM public.admin_users au
            WHERE au.user_id = auth.uid()
              AND (au.role = 'owner' OR au.role = 'admin')
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.admin_users au
            WHERE au.user_id = auth.uid()
              AND (au.role = 'owner' OR au.role = 'admin')
          )
        );
    $q$;
  END IF;
END
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies p
    WHERE p.policyname = 'allow_core_team_permission_update'
      AND p.schemaname = 'public'
      AND p.tablename = 'core_team_members'
  ) THEN
    EXECUTE $q$
      CREATE POLICY "allow_core_team_permission_update"
        ON public.core_team_members
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM public.admin_permissions ap
            WHERE ap.user_id = auth.uid()
              AND ap.can_core_team = true
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.admin_permissions ap
            WHERE ap.user_id = auth.uid()
              AND ap.can_core_team = true
          )
        );
    $q$;
  END IF;
END
$$ LANGUAGE plpgsql;

-- 7) Quick verification query (run after migration/backfill)
-- SELECT id, name, core_committee_id, is_council
-- FROM public.core_team_members
-- ORDER BY is_council DESC, id ASC
-- LIMIT 200;

-- 8) Rollback (careful: destructive)
-- DROP INDEX IF EXISTS idx_core_team_members_is_council;
-- ALTER TABLE public.core_team_members DROP COLUMN IF EXISTS is_council;

-- FILE: migrations/20250930_create_event_winners.sql

-- Migration: Create event_winners table
-- Date: 2025-09-30
-- Purpose: create the event_winners table to store winners (name, position, optional photo) per event or category.
-- Notes:
--  - event_id is nullable to support category-/track-level winners that aren't tied to a single event.
--  - A partial unique index prevents duplicate 'position' values for the same event (when event_id is present).
--  - Row Level Security (RLS) policies below are examples; adapt the admin check to your project's auth/permission model.

BEGIN;

CREATE TABLE IF NOT EXISTS public.event_winners (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id bigint REFERENCES public.events(id) ON DELETE SET NULL,
  category text,
  position integer NOT NULL DEFAULT 0,
  name text NOT NULL,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Useful lookups
CREATE INDEX IF NOT EXISTS idx_event_winners_event_id ON public.event_winners (event_id);
CREATE INDEX IF NOT EXISTS idx_event_winners_category ON public.event_winners (category);

-- Prevent two winners from having the same position for the same event (only when event_id is set)
CREATE UNIQUE INDEX IF NOT EXISTS uq_event_winners_event_position ON public.event_winners (event_id, position) WHERE event_id IS NOT NULL;

-- Enable Row Level Security so policies below can be applied
ALTER TABLE public.event_winners ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read winners (public). If you want to restrict reads, change the USING clause.
CREATE POLICY "EventWinners_Select" ON public.event_winners
  FOR SELECT
  USING (true);

-- Allow authenticated admin users to INSERT winners.
-- This example checks the `admin_permissions` table for a matching user_id with can_events = true.
-- Adjust the condition if your project uses a different permission model.
CREATE POLICY "EventWinners_Insert_Admins" ON public.event_winners
  FOR INSERT
  TO authenticated
  WITH CHECK (exists (
    select 1 from public.admin_permissions ap where ap.user_id = auth.uid() and ap.can_events = true
  ));

-- Allow authenticated admin users to UPDATE winners (only if they are allowed to manage events)
CREATE POLICY "EventWinners_Update_Admins" ON public.event_winners
  FOR UPDATE
  TO authenticated
  USING (exists (
    select 1 from public.admin_permissions ap where ap.user_id = auth.uid() and ap.can_events = true
  ))
  WITH CHECK (exists (
    select 1 from public.admin_permissions ap where ap.user_id = auth.uid() and ap.can_events = true
  ));

-- Allow authenticated admin users to DELETE winners
CREATE POLICY "EventWinners_Delete_Admins" ON public.event_winners
  FOR DELETE
  TO authenticated
  USING (exists (
    select 1 from public.admin_permissions ap where ap.user_id = auth.uid() and ap.can_events = true
  ));

COMMIT;

-- FILE: migrations/20250930_event_winners_add_registration_id.sql

-- Migration: add registration_id to event_winners so winners can reference a participant registration
-- Run this in your Supabase SQL editor or via psql against your database

BEGIN;

ALTER TABLE IF EXISTS public.event_winners
  ADD COLUMN IF NOT EXISTS registration_id text;

-- Optional FK constraint to link to registrations.id (text). Use ON DELETE SET NULL so historic winners remain if a registration is removed.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.conname = 'event_winners_registration_id_fkey' AND t.relname = 'event_winners'
  ) THEN
    ALTER TABLE public.event_winners
      ADD CONSTRAINT event_winners_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.registrations(id) ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_event_winners_registration_id ON public.event_winners (registration_id);

COMMIT;

-- FILE: migrations/20250930_purge_audit_logs.sql

-- Migration: detect audit table and create purge function + schedule if present
-- This migration is defensive: it will search for common audit table names and only apply changes
-- if a matching table is found. This avoids 'relation does not exist' errors.

DO $$
DECLARE
  candidate_tables TEXT[] := ARRAY['audit_logs','auth_audit','audit','audit_logs_raw','audit_log'];
  found_table TEXT := NULL;
  t TEXT;
BEGIN
  FOREACH t IN ARRAY candidate_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      found_table := t;
      EXIT;
    END IF;
  END LOOP;

  IF found_table IS NULL THEN
    RAISE NOTICE 'No known audit table found in public schema. Skipping audit purge migration.';
    RETURN;
  END IF;

  RAISE NOTICE 'Audit table found: public.%', found_table;

  -- 1) Create index on created_at if the column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=found_table AND column_name='created_at') THEN
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_created_at ON public.%I (created_at);', found_table, found_table);
  ELSE
    RAISE NOTICE 'Table public.% does not have a created_at column; skipping index and purge function creation.', found_table;
    RETURN;
  END IF;

  -- 2) Create a safe purge function that references the discovered table name
  -- The function embeds the table name at creation time and performs simple DELETEs in batches.
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION public.purge_%I_older_than(max_age interval, batch_size integer DEFAULT 2000)
    RETURNS void
    AS $body$
    DECLARE
      deleted_count integer := 0;
    BEGIN
      LOOP
        DELETE FROM public.%I
        WHERE created_at < now() - max_age
        LIMIT batch_size;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        EXIT WHEN deleted_count = 0;
        PERFORM pg_sleep(0.08);
      END LOOP;
    END;
    $body$ LANGUAGE plpgsql;
  $f$, found_table, found_table);

  -- 3) Try to register a pg_cron job (tolerant to missing extension)
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.schedule(
        format('purge_%s_48h_hourly', found_table),
        '0 * * * *',
        format('SELECT public.purge_%s_older_than(''48 hours'', 2000);', found_table)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'pg_cron schedule creation skipped or already present for table %: %', found_table, SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'pg_cron not installed; skipping schedule for table %', found_table;
  END IF;

END$$;

-- Usage notes:
-- If a table was found this migration created:
--  - An index: idx_<table>_created_at
--  - A function: public.purge_<table>_older_than(max_age, batch_size)
-- Call manually (example): SELECT public.purge_audit_logs_older_than('48 hours', 2000);


-- FILE: migrations/20251001_event_winners_allow_duplicate_positions.sql

-- Migration: Allow multiple winners to share the same position
-- Purpose: Remove the unique index on (event_id, position) which prevented storing
-- multiple winners at the same numeric position for an event (e.g. multiple 1st places).
-- Drop the unique index/constraint if present (idempotent)
DO $$
BEGIN
  -- Try drop as an index (common case)
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'uq_event_winners_event_position'
  ) THEN
    EXECUTE 'DROP INDEX IF EXISTS public.uq_event_winners_event_position';
  END IF;

  -- Also try drop as a table constraint just in case it was created as one
  IF EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE con.conname = 'uq_event_winners_event_position' AND rel.relname = 'event_winners'
  ) THEN
    EXECUTE 'ALTER TABLE public.event_winners DROP CONSTRAINT IF EXISTS uq_event_winners_event_position';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Non-fatal: log a notice and continue
  RAISE NOTICE 'Could not remove uq_event_winners_event_position: %', SQLERRM;
END$$;

-- Optional: create a non-unique index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_event_winners_event_position ON public.event_winners (event_id, position);

-- Safety check: list indexes can be run after deployment to confirm state.

-- FILE: migrations/20251002_add_admin_blocked_devices_ip.sql


-- FILE: migrations/20251002_create_admin_device_tables.sql


-- FILE: migrations/20251003_add_admin_device_sessions_ended_at.sql


-- FILE: migrations/20251003_add_admin_device_tables.sql


-- FILE: migrations/20251003_add_device_id_columns.sql


-- FILE: migrations/20251003_add_server_ip_capture.sql


-- FILE: migrations/20251003_add_user_id_to_admin_blocked_devices.sql


-- FILE: migrations/20251003_alter_admin_blocked_devices_add_device_id_ip.sql


-- FILE: migrations/20251006_add_winners_display_mode.sql

-- Add a per-event winners display mode toggle
-- photos (default): show photo cards per winner
-- list: show top-4 positions as names (supports multiple winners per position)

alter table if exists public.events
  add column if not exists winners_display_mode text
  check (winners_display_mode in ('photos','list'))
  default 'list';

-- Ensure event_winners can link to a registration when owners want to show year from registration
-- (Column may already exist; add if missing)
alter table if exists public.event_winners
  add column if not exists registration_id uuid;

-- Optionally add an index for faster lookups by event and position
create index if not exists idx_event_winners_event_pos on public.event_winners(event_id, position);

-- FILE: migrations/20251006_add_year_to_event_winners.sql


-- FILE: migrations/20251006_create_notifications.sql

-- Create notifications table for admin/owner pushed messages shown to viewers
create table if not exists public.notifications (
  id bigserial primary key,
  title text null,
  message text not null,
  type text not null default 'info', -- info | success | warning | error
  link_url text null,
  visible boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz null,
  priority int not null default 0,
  created_by uuid null,
  created_at timestamptz not null default now()
);

comment on table public.notifications is 'Admin-pushed notifications for viewer panel';
comment on column public.notifications.type is 'info | success | warning | error';

-- FILE: migrations/20251006_notifications_add_auto_dismiss_seconds.sql

-- Add per-notification auto-dismiss timer (seconds)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'auto_dismiss_seconds'
  ) THEN
    ALTER TABLE public.notifications
      ADD COLUMN auto_dismiss_seconds integer NULL;
    COMMENT ON COLUMN public.notifications.auto_dismiss_seconds IS 'Optional: number of seconds the popup should auto-dismiss after showing; 0 or null means disabled (falls back to client defaults).';
  END IF;
END $$;

-- No-op if table missing; safe to run in any environment
-- FILE: migrations/20251006_notifications_add_text_glow_colors.sql

-- Add optional text and glow color columns to notifications
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'notifications'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'text_color'
    ) THEN
      ALTER TABLE public.notifications ADD COLUMN text_color text NULL;
      COMMENT ON COLUMN public.notifications.text_color IS 'Optional CSS color for title/message text (e.g., #ffffff).';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'glow_color'
    ) THEN
      ALTER TABLE public.notifications ADD COLUMN glow_color text NULL;
      COMMENT ON COLUMN public.notifications.glow_color IS 'Optional CSS color for title glow (e.g., #ff00ff).';
    END IF;
  END IF;
END $$;

-- Safe to run repeatedly
-- FILE: migrations/20251007_add_motion_poster_autoplay.sql

-- Migration: Add motion_poster_autoplay to events
-- Date: 2025-10-07
-- Adds a per-event flag to control whether the motion poster video should autoplay on the public event card.

BEGIN;

-- Add the column if it doesn't exist. Default false so existing rows won't autoplay.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS motion_poster_autoplay boolean DEFAULT false;

-- Optional: provide a descriptive comment on the column
COMMENT ON COLUMN public.events.motion_poster_autoplay IS 'Whether the motion poster should autoplay on the event card (admin-controlled)';

COMMIT;

-- FILE: migrations/20251007_add_owner_hover_reveal.sql

-- Migration: Add owner_hover_reveal to events
-- Date: 2025-10-07
-- Allows the site owner to enable hover reveal for a specific event (visible to owner when viewing event page)

BEGIN;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS owner_hover_reveal boolean DEFAULT false;

COMMENT ON COLUMN public.events.owner_hover_reveal IS 'When true, owner viewing the site will see the motion poster/image revealed by default (owner-only preview toggle)';

COMMIT;

-- FILE: migrations/20251007_add_rules_link_to_events.sql

-- Add nullable rules_link column to events so we can store PDF / Drive URLs
ALTER TABLE IF EXISTS events
  ADD COLUMN IF NOT EXISTS rules_link text;

-- FILE: migrations/20251007_create_admin_device_sessions.sql


-- FILE: migrations/20251010_add_event_registration_default_mode.sql

-- Migration: add per-event default registration mode
-- Adds `registration_default_mode` to the events table so admin UI changes have a backing column.
-- Values: 'individual' or 'team'. Default is 'individual'.

ALTER TABLE IF EXISTS events
  ADD COLUMN IF NOT EXISTS registration_default_mode text DEFAULT 'individual';

-- Add a check constraint to ensure only allowed values are stored
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'events' AND c.conname = 'events_registration_default_mode_check'
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT events_registration_default_mode_check CHECK (registration_default_mode IN ('individual', 'team'));
  END IF;
END$$;

-- NOTE: After applying this migration in Supabase Studio (SQL editor), refresh your API/schema cache so the client sees the new column.
-- Example: Open Supabase Studio -> SQL editor -> run this file; then in Studio reload the Tables view or trigger any "Reset API" / "Refresh schema" action your deployment uses.

-- FILE: migrations/20251010_add_registration_settings.sql

-- Migration: add registration-related columns to site_settings
-- Date: 2025-10-10

BEGIN;

-- participant types (array of text)
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS registration_participant_types text[] DEFAULT ARRAY['1st Year','2nd Year','3rd Year','4th Year'];

-- optional institution field flag
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS registration_institution_optional boolean DEFAULT false;

-- photo defaults
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS registration_photo_default_required boolean DEFAULT false;

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS registration_photo_default_label text DEFAULT NULL;

-- placeholders for inputs (jsonb object)
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS registration_field_placeholders jsonb DEFAULT (
    jsonb_build_object(
      'full_name', 'Enter full name',
      'email', 'user@domain.com',
      'phone', 'Contact number',
      'college', 'Your college or institution'
    )
  );

-- optional form fields JSON (array of objects describing fields)
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS registration_form_fields jsonb DEFAULT NULL;

COMMIT;

-- FILE: migrations/20251010_add_team_max_members.sql

-- Add per-event team max members limit used by Registration modal when in team mode
-- Nullable means: if NULL, fall back to global default (currently 50 in UI)
alter table if exists public.events
  add column if not exists team_max_members integer;

-- Optional safety bounds (keep values sensible). Wrap in DO block to avoid errors if already exists.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'events_team_max_members_bounds'
  ) then
    alter table public.events
      add constraint events_team_max_members_bounds
      check (team_max_members is null or (team_max_members >= 2 and team_max_members <= 50));
  end if;
end $$;

comment on column public.events.team_max_members is 'Max team members allowed for this event when registering as a team; NULL uses default (UI default 50).';

-- FILE: migrations/20251011_add_check_registration_quota.sql

-- Create a server-side quota check not affected by RLS
-- Date: 2025-10-11

-- Function: check_registration_quota(e_id bigint, p_type text)
-- Returns one row with is_full (boolean), approved_count, pending_count, and max slots.
-- Behavior:
--  - Uses per-event quotas when present, else site-level quotas
--  - Interprets 0 as closed, NULL as unlimited
--  - Considers both pending and approved submissions when comparing to max

create or replace function public.check_registration_quota(e_id bigint, p_type text)
returns table(
  is_full boolean,
  approved_count integer,
  pending_count integer,
  max integer
)
language sql
security definer
set search_path = public
as $$
with q as (
  select coalesce(
    (select (registration_participant_quotas ->> p_type)::int from public.events where id = e_id),
    (select (registration_participant_quotas ->> p_type)::int from public.site_settings limit 1)
  ) as max_slots
),
counts as (
  select
    (select count(*) from public.registrations r where r.event_id = e_id and r.participant_type = p_type and r.status = 'approved') as approved,
    (select count(*) from public.registrations r where r.event_id = e_id and r.participant_type = p_type and r.status in ('pending','approved')) as total
)
select
  case
    when q.max_slots is null then false
    when q.max_slots <= 0 then true
    when counts.total >= q.max_slots then true
    else false
  end as is_full,
  counts.approved as approved_count,
  (counts.total - counts.approved) as pending_count,
  q.max_slots as max
from q, counts;
$$;

grant execute on function public.check_registration_quota(bigint, text) to anon, authenticated;

-- FILE: migrations/20251011_add_event_registration_participant_quotas.sql

-- Add per-event participant-type quotas so each event can have different limits
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS registration_participant_quotas jsonb DEFAULT NULL;

COMMENT ON COLUMN public.events.registration_participant_quotas IS 'Per-event map of participant_type => max approved registrations (0 = closed, missing/null = unlimited). Overrides site_settings.registration_participant_quotas when present.';

-- FILE: migrations/20251011_add_registration_institution_visible.sql

-- Migration: add registration_institution_visible to site_settings
-- Date: 2025-10-11

BEGIN;

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS registration_institution_visible boolean DEFAULT true;

COMMIT;

-- FILE: migrations/20251011_add_registration_participant_quotas.sql

Expose an admin toggle to choose the counting policy (approved-only vs pending+approved).
-- FILE: migrations/20251011_add_site_registration_quotas_and_visibility.sql

-- Add site-level registration quotas and Institution visibility toggle
-- Date: 2025-10-11

BEGIN;

-- Site-wide participant-type quotas (fallback when event-specific quotas are not set)
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS registration_participant_quotas jsonb DEFAULT NULL;

COMMENT ON COLUMN public.site_settings.registration_participant_quotas IS 'Site-wide map of participant_type => max approved registrations (0 = closed, missing/null = unlimited). Used as fallback when events.registration_participant_quotas is not set.';

-- Global toggle to show/hide Institution/College field in Registration Modal
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS registration_institution_visible boolean DEFAULT true;

COMMENT ON COLUMN public.site_settings.registration_institution_visible IS 'If false, hide the Institution/College field for viewers. Combine with registration_institution_optional to make it optional when visible.';

COMMIT;
