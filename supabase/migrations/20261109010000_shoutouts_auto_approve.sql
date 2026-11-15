-- Participant messages publish without an approval queue. Existing access/limit policies remain.
ALTER TABLE public.shoutouts ALTER COLUMN is_approved SET DEFAULT true;
UPDATE public.shoutouts SET is_approved = true WHERE is_approved IS DISTINCT FROM true;

CREATE OR REPLACE FUNCTION public.shoutouts_auto_approve_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.is_approved := true;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER shoutouts_auto_approve_insert
BEFORE INSERT ON public.shoutouts
FOR EACH ROW EXECUTE FUNCTION public.shoutouts_auto_approve_insert();
NOTIFY pgrst, 'reload schema';
