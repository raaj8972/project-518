-- Homebound's page editor stores its text, media, categories and journey in one
-- document. Existing public-read/admin-write policies continue to govern it.
ALTER TABLE public.homebound_settings
  ADD COLUMN IF NOT EXISTS page_content jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.homebound_settings'::regclass
      AND conname = 'homebound_page_content_object'
  ) THEN
    ALTER TABLE public.homebound_settings
      ADD CONSTRAINT homebound_page_content_object
      CHECK (jsonb_typeof(page_content) = 'object');
  END IF;
END $$;

COMMENT ON COLUMN public.homebound_settings.page_content IS
  'Homebound page copy, images, section visibility, editable categories and ordered journey cards.';

-- Keep already-open public pages in sync with saved admin edits. Publication
-- membership still observes this table's existing row-level read policies.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
         AND tablename = 'homebound_settings'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.homebound_settings;
  END IF;
END $$;

-- band_members.category is already unrestricted text; new categories require
-- no enum changes, roster rewrites, or broader permissions.
NOTIFY pgrst, 'reload schema';
