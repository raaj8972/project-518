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

