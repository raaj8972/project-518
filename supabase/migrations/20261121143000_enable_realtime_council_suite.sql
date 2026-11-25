-- Enable Realtime Replication for Council Suite tables safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'council_tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.council_tasks;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'council_announcements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.council_announcements;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'council_budgets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.council_budgets;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'council_expenses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.council_expenses;
  END IF;
END $$;
