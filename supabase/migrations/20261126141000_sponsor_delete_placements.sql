-- Remove publication links in the same transaction as the sponsor. Otherwise an
-- old name/logo placement can reappear as a standalone legacy partner.
BEGIN;
CREATE OR REPLACE FUNCTION public.remove_deleted_sponsor_placement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  UPDATE public.homepage_settings
  SET sponsor_logos=(
    SELECT coalesce(jsonb_agg(record ORDER BY ordinal),'[]'::jsonb)
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(sponsor_logos)='array' THEN sponsor_logos ELSE '[]'::jsonb END) WITH ORDINALITY AS entries(record,ordinal)
    WHERE NOT (
      coalesce(record->>'sponsor_id','')=OLD.id::text
      OR (record->>'sponsor_id' IS NULL AND record->>'archived_sponsor_id' IS NULL
        AND lower(trim(coalesce(record->>'name','')))=lower(trim(OLD.name))
        AND coalesce(record->>'logo_url',record->>'logo','')=OLD.logo)
    )
  ) WHERE id=1;
  RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.remove_deleted_sponsor_placement() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS sponsors_remove_publication ON public.sponsors;
CREATE TRIGGER sponsors_remove_publication AFTER DELETE ON public.sponsors FOR EACH ROW EXECUTE FUNCTION public.remove_deleted_sponsor_placement();
NOTIFY pgrst,'reload schema';
COMMIT;
