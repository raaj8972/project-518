-- Persist edition and visitor default; preserve legacy tagged programmes.
BEGIN;
ALTER TABLE public.schedule_days ADD COLUMN IF NOT EXISTS schedule_type text;
UPDATE public.schedule_days SET schedule_type=CASE WHEN title ~* '\[MAINS\]' THEN 'mains' ELSE 'prelims' END WHERE schedule_type IS NULL;
ALTER TABLE public.schedule_days ALTER COLUMN schedule_type SET DEFAULT 'prelims';
ALTER TABLE public.schedule_days ALTER COLUMN schedule_type SET NOT NULL;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.schedule_days'::regclass AND conname='schedule_days_edition_check') THEN
  ALTER TABLE public.schedule_days ADD CONSTRAINT schedule_days_edition_check CHECK(schedule_type IN ('prelims','mains'));
 END IF;
END $$;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS default_schedule_type text NOT NULL DEFAULT 'prelims' CHECK(default_schedule_type IN ('prelims','mains'));
-- Existing policy was named "admins" but allowed every visitor to read delivery addresses.
DROP POLICY IF EXISTS email_logs_admin_read_guard ON public.email_logs;
CREATE POLICY email_logs_admin_read_guard ON public.email_logs AS RESTRICTIVE FOR SELECT TO anon,authenticated USING(public.current_admin_access());
NOTIFY pgrst,'reload schema';
COMMIT;
