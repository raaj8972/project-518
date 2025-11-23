-- Ensure guest-artist-audio bucket exists with sane defaults and policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'guest-artist-audio') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'guest-artist-audio',
      'guest-artist-audio',
      TRUE,
      26214400, -- 25 MB
      ARRAY['audio/mpeg','audio/mp3','audio/ogg','audio/wav','audio/webm','audio/*']
    );
  ELSE
    UPDATE storage.buckets
      SET public = TRUE,
          file_size_limit = 26214400,
          allowed_mime_types = ARRAY['audio/mpeg','audio/mp3','audio/ogg','audio/wav','audio/webm','audio/*']
      WHERE id = 'guest-artist-audio';
  END IF;
END $$;

-- Drop conflicting policies if they already exist so we can re-create idempotently
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read guest-artist-audio') THEN
    DROP POLICY "Public read guest-artist-audio" ON storage.objects;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth insert guest-artist-audio') THEN
    DROP POLICY "Auth insert guest-artist-audio" ON storage.objects;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth update guest-artist-audio') THEN
    DROP POLICY "Auth update guest-artist-audio" ON storage.objects;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth delete guest-artist-audio') THEN
    DROP POLICY "Auth delete guest-artist-audio" ON storage.objects;
  END IF;
END $$;

-- Public read so the site can play the audio, authenticated admins can manage files
CREATE POLICY "Public read guest-artist-audio" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'guest-artist-audio');

CREATE POLICY "Auth insert guest-artist-audio" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'guest-artist-audio');

CREATE POLICY "Auth update guest-artist-audio" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'guest-artist-audio')
  WITH CHECK (bucket_id = 'guest-artist-audio');

CREATE POLICY "Auth delete guest-artist-audio" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'guest-artist-audio');
