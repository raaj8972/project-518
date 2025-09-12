/*
  Ensure all storage buckets exist and have correct RLS policies.
  Buckets covered:
    - band-images, event-images, gallery-images, team-images, faculty-images
    - guest-artist-images, guest-artist-videos
    - hero-media, hero-video
    - sponsor-logos
    - documents, pdf

  Policies:
    - Public SELECT (read)
    - INSERT/UPDATE/DELETE for authenticated users

  Safe/idempotent: uses ON CONFLICT and DROP POLICY IF EXISTS
*/

-- Helper: create or update a bucket with given allowed mime types
-- Images + videos
DO $$ BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('band-images','band-images', true, 83886080,
    ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/gif','video/mp4','video/quicktime','video/webm']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('event-images','event-images', true, 83886080,
    ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/gif','video/mp4','video/quicktime','video/webm']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('gallery-images','gallery-images', true, 83886080,
    ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/gif','video/mp4','video/quicktime','video/webm']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('team-images','team-images', true, 83886080,
    ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/gif','video/mp4','video/quicktime','video/webm']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('faculty-images','faculty-images', true, 83886080,
    ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/gif','video/mp4','video/quicktime','video/webm']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('guest-artist-images','guest-artist-images', true, 83886080,
    ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/gif','video/mp4','video/quicktime','video/webm']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('guest-artist-videos','guest-artist-videos', true, 524288000, -- 500MB
    ARRAY['video/mp4','video/quicktime','video/webm']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('hero-media','hero-media', true, 524288000,
    ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/gif','video/mp4','video/quicktime','video/webm']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('hero-video','hero-video', true, 524288000,
    ARRAY['video/mp4','video/quicktime','video/webm']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('sponsor-logos','sponsor-logos', true, 83886080,
    ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/gif']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('documents','documents', true, 104857600,
    ARRAY['application/pdf','image/png','image/jpeg','image/jpg']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('pdf','pdf', true, 104857600,
    ARRAY['application/pdf']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
END $$;

-- Policies per bucket (drop/create)
-- band-images
DROP POLICY IF EXISTS "Public read band-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth insert band-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth update band-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete band-images" ON storage.objects;
CREATE POLICY "Public read band-images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'band-images');
CREATE POLICY "Auth insert band-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'band-images');
CREATE POLICY "Auth update band-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'band-images') WITH CHECK (bucket_id = 'band-images');
CREATE POLICY "Auth delete band-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'band-images');

-- event-images
DROP POLICY IF EXISTS "Public read event-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth insert event-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth update event-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete event-images" ON storage.objects;
CREATE POLICY "Public read event-images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'event-images');
CREATE POLICY "Auth insert event-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'event-images');
CREATE POLICY "Auth update event-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'event-images') WITH CHECK (bucket_id = 'event-images');
CREATE POLICY "Auth delete event-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'event-images');

-- gallery-images
DROP POLICY IF EXISTS "Public read gallery-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth insert gallery-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth update gallery-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete gallery-images" ON storage.objects;
CREATE POLICY "Public read gallery-images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'gallery-images');
CREATE POLICY "Auth insert gallery-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'gallery-images');
CREATE POLICY "Auth update gallery-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'gallery-images') WITH CHECK (bucket_id = 'gallery-images');
CREATE POLICY "Auth delete gallery-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'gallery-images');

-- team-images
DROP POLICY IF EXISTS "Public read team-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth insert team-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth update team-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete team-images" ON storage.objects;
CREATE POLICY "Public read team-images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'team-images');
CREATE POLICY "Auth insert team-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'team-images');
CREATE POLICY "Auth update team-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'team-images') WITH CHECK (bucket_id = 'team-images');
CREATE POLICY "Auth delete team-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'team-images');

-- faculty-images
DROP POLICY IF EXISTS "Public read faculty-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth insert faculty-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth update faculty-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete faculty-images" ON storage.objects;
CREATE POLICY "Public read faculty-images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'faculty-images');
CREATE POLICY "Auth insert faculty-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'faculty-images');
CREATE POLICY "Auth update faculty-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'faculty-images') WITH CHECK (bucket_id = 'faculty-images');
CREATE POLICY "Auth delete faculty-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'faculty-images');

-- guest-artist-images
DROP POLICY IF EXISTS "Public read guest-artist-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth insert guest-artist-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth update guest-artist-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete guest-artist-images" ON storage.objects;
CREATE POLICY "Public read guest-artist-images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'guest-artist-images');
CREATE POLICY "Auth insert guest-artist-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'guest-artist-images');
CREATE POLICY "Auth update guest-artist-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'guest-artist-images') WITH CHECK (bucket_id = 'guest-artist-images');
CREATE POLICY "Auth delete guest-artist-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'guest-artist-images');

-- guest-artist-videos
DROP POLICY IF EXISTS "Public read guest-artist-videos" ON storage.objects;
DROP POLICY IF EXISTS "Auth insert guest-artist-videos" ON storage.objects;
DROP POLICY IF EXISTS "Auth update guest-artist-videos" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete guest-artist-videos" ON storage.objects;
CREATE POLICY "Public read guest-artist-videos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'guest-artist-videos');
CREATE POLICY "Auth insert guest-artist-videos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'guest-artist-videos');
CREATE POLICY "Auth update guest-artist-videos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'guest-artist-videos') WITH CHECK (bucket_id = 'guest-artist-videos');
CREATE POLICY "Auth delete guest-artist-videos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'guest-artist-videos');

-- hero-media
DROP POLICY IF EXISTS "Public read hero-media" ON storage.objects;
DROP POLICY IF EXISTS "Auth insert hero-media" ON storage.objects;
DROP POLICY IF EXISTS "Auth update hero-media" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete hero-media" ON storage.objects;
CREATE POLICY "Public read hero-media" ON storage.objects FOR SELECT TO public USING (bucket_id = 'hero-media');
CREATE POLICY "Auth insert hero-media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'hero-media');
CREATE POLICY "Auth update hero-media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'hero-media') WITH CHECK (bucket_id = 'hero-media');
CREATE POLICY "Auth delete hero-media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'hero-media');

-- hero-video
DROP POLICY IF EXISTS "Public read hero-video" ON storage.objects;
DROP POLICY IF EXISTS "Auth insert hero-video" ON storage.objects;
DROP POLICY IF EXISTS "Auth update hero-video" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete hero-video" ON storage.objects;
CREATE POLICY "Public read hero-video" ON storage.objects FOR SELECT TO public USING (bucket_id = 'hero-video');
CREATE POLICY "Auth insert hero-video" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'hero-video');
CREATE POLICY "Auth update hero-video" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'hero-video') WITH CHECK (bucket_id = 'hero-video');
CREATE POLICY "Auth delete hero-video" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'hero-video');

-- sponsor-logos
DROP POLICY IF EXISTS "Public read sponsor-logos" ON storage.objects;
DROP POLICY IF EXISTS "Auth insert sponsor-logos" ON storage.objects;
DROP POLICY IF EXISTS "Auth update sponsor-logos" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete sponsor-logos" ON storage.objects;
CREATE POLICY "Public read sponsor-logos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'sponsor-logos');
CREATE POLICY "Auth insert sponsor-logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'sponsor-logos');
CREATE POLICY "Auth update sponsor-logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'sponsor-logos') WITH CHECK (bucket_id = 'sponsor-logos');
CREATE POLICY "Auth delete sponsor-logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'sponsor-logos');

-- documents
DROP POLICY IF EXISTS "Public read documents" ON storage.objects;
DROP POLICY IF EXISTS "Auth insert documents" ON storage.objects;
DROP POLICY IF EXISTS "Auth update documents" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete documents" ON storage.objects;
CREATE POLICY "Public read documents" ON storage.objects FOR SELECT TO public USING (bucket_id = 'documents');
CREATE POLICY "Auth insert documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');
CREATE POLICY "Auth update documents" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'documents') WITH CHECK (bucket_id = 'documents');
CREATE POLICY "Auth delete documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents');

-- pdf
DROP POLICY IF EXISTS "Public read pdf" ON storage.objects;
DROP POLICY IF EXISTS "Auth insert pdf" ON storage.objects;
DROP POLICY IF EXISTS "Auth update pdf" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete pdf" ON storage.objects;
CREATE POLICY "Public read pdf" ON storage.objects FOR SELECT TO public USING (bucket_id = 'pdf');
CREATE POLICY "Auth insert pdf" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pdf');
CREATE POLICY "Auth update pdf" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'pdf') WITH CHECK (bucket_id = 'pdf');
CREATE POLICY "Auth delete pdf" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'pdf');
