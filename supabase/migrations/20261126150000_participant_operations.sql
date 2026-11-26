-- Reconcile participant email history and keep passes in the same transaction
-- as registration review. Existing application records and branding files remain.
BEGIN;

ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS template_type text;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS provider text;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS event_id text;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS details jsonb;
UPDATE public.email_logs SET template_type=coalesce(template_type,email_type),
  details=coalesce(details,metadata,'{}'::jsonb),provider=coalesce(provider,metadata->>'provider');

CREATE OR REPLACE FUNCTION public.normalize_participant_email_log() RETURNS trigger
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
  NEW.email_type:=coalesce(nullif(NEW.email_type,''),nullif(NEW.template_type,''));
  NEW.template_type:=coalesce(nullif(NEW.template_type,''),NEW.email_type);
  NEW.details:=coalesce(NEW.details,NEW.metadata,'{}'::jsonb);
  NEW.metadata:=coalesce(NEW.metadata,NEW.details,'{}'::jsonb);
  NEW.provider:=coalesce(NEW.provider,NEW.details->>'provider',NEW.metadata->>'provider');
  NEW.subject:=coalesce(NEW.subject,NEW.details->>'subject');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS participant_email_log_compatibility ON public.email_logs;
CREATE TRIGGER participant_email_log_compatibility BEFORE INSERT OR UPDATE ON public.email_logs
FOR EACH ROW EXECUTE FUNCTION public.normalize_participant_email_log();

-- Keep historical delivery evidence when an owner deletes its registration.
ALTER TABLE public.email_logs DROP CONSTRAINT IF EXISTS email_logs_registration_id_fkey;
ALTER TABLE public.email_logs ADD CONSTRAINT email_logs_registration_id_fkey
  FOREIGN KEY(registration_id) REFERENCES public.registrations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS email_logs_registration_template_idx ON public.email_logs(registration_id,template_type,created_at DESC);
DROP POLICY IF EXISTS participant_email_read ON public.email_logs;
CREATE POLICY participant_email_read ON public.email_logs AS RESTRICTIVE FOR SELECT TO anon,authenticated
  USING(public.admin_can_manage_pages(ARRAY['registrations','events','auditions'],ARRAY['can_registrations','can_events']));
DROP POLICY IF EXISTS participant_email_insert ON public.email_logs;
CREATE POLICY participant_email_insert ON public.email_logs AS RESTRICTIVE FOR INSERT TO anon,authenticated WITH CHECK(false);
DROP POLICY IF EXISTS participant_email_update ON public.email_logs;
CREATE POLICY participant_email_update ON public.email_logs AS RESTRICTIVE FOR UPDATE TO anon,authenticated USING(false) WITH CHECK(false);
DROP POLICY IF EXISTS participant_email_delete ON public.email_logs;
CREATE POLICY participant_email_delete ON public.email_logs AS RESTRICTIVE FOR DELETE TO anon,authenticated USING(false);

-- Public forms may create only new pending applications, never self-review.
DROP POLICY IF EXISTS audition_pending_submission ON public.auditions;
CREATE POLICY audition_pending_submission ON public.auditions AS RESTRICTIVE FOR INSERT TO anon,authenticated
  WITH CHECK(status='pending' AND length(trim(full_name)) BETWEEN 1 AND 200
    AND length(email) BETWEEN 3 AND 254 AND length(phone) BETWEEN 5 AND 40
    AND length(trim(instrument_role)) BETWEEN 1 AND 150
    AND (portfolio_link IS NULL OR portfolio_link='' OR portfolio_link ~* '^https?://'));
DROP POLICY IF EXISTS audition_assigned_update ON public.auditions;
CREATE POLICY audition_assigned_update ON public.auditions AS RESTRICTIVE FOR UPDATE TO anon,authenticated
  USING(public.admin_can_manage_pages(ARRAY['auditions'],ARRAY[]::text[]))
  WITH CHECK(public.admin_can_manage_pages(ARRAY['auditions'],ARRAY[]::text[]));
DROP POLICY IF EXISTS audition_assigned_delete ON public.auditions;
CREATE POLICY audition_assigned_delete ON public.auditions AS RESTRICTIVE FOR DELETE TO anon,authenticated
  USING(public.admin_can_manage_pages(ARRAY['auditions'],ARRAY[]::text[]));

CREATE OR REPLACE FUNCTION public.sync_participant_entry_passes() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    DELETE FROM public.entry_passes WHERE registration_id=OLD.id OR event_registration_id=OLD.id;
    RETURN OLD;
  END IF;
  UPDATE public.entry_passes SET is_active=(NEW.status='approved' AND coalesce(NEW.is_active,false) AND NEW.deleted_at IS NULL)
    WHERE (registration_id=NEW.id OR event_registration_id=NEW.id)
      AND is_active IS DISTINCT FROM (NEW.status='approved' AND coalesce(NEW.is_active,false) AND NEW.deleted_at IS NULL);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_participant_entry_passes() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS participant_entry_pass_sync ON public.registrations;
CREATE TRIGGER participant_entry_pass_sync AFTER UPDATE OF status,is_active,deleted_at OR DELETE ON public.registrations
FOR EACH ROW EXECUTE FUNCTION public.sync_participant_entry_passes();

-- Only shared raster branding assets are replaceable by the assigned page staff.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('pdf-watermarks','pdf-watermarks',true,5242880,ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT(id) DO UPDATE SET file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
DROP POLICY IF EXISTS participant_branding_insert ON storage.objects;
CREATE POLICY participant_branding_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO anon,authenticated
  WITH CHECK(bucket_id<>'pdf-watermarks' OR (name IN('watermark.png','stamp.png','email_stamp.png')
    AND public.admin_can_manage_pages(ARRAY['registrations','events','auditions','memberships'],ARRAY['can_registrations','can_events'])));
DROP POLICY IF EXISTS participant_branding_update ON storage.objects;
CREATE POLICY participant_branding_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon,authenticated
  USING(bucket_id<>'pdf-watermarks' OR public.can_manage_storage_bucket('pdf-watermarks'))
  WITH CHECK(bucket_id<>'pdf-watermarks' OR (name IN('watermark.png','stamp.png','email_stamp.png') AND public.can_manage_storage_bucket('pdf-watermarks')));
DROP POLICY IF EXISTS participant_branding_delete ON storage.objects;
CREATE POLICY participant_branding_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO anon,authenticated
  USING(bucket_id<>'pdf-watermarks' OR public.can_manage_storage_bucket('pdf-watermarks'));
NOTIFY pgrst,'reload schema';
COMMIT;
