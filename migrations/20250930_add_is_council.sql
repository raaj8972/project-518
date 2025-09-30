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
