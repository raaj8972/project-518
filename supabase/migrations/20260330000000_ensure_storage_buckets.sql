-- Ensure buckets exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('gallery', 'gallery', true),
  ('chat-attachments', 'chat-attachments', true),
  ('pdf-watermarks', 'pdf-watermarks', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS for storage buckets (simplistic for now - can be hardened later as needed)
-- In a real app, you'd want more granular policies based on user auth/roles.

-- Allow public access to all created buckets for reading
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND policyname = 'Public Access for Gallery'
    ) THEN
        CREATE POLICY "Public Access for Gallery" ON storage.objects FOR SELECT USING (bucket_id = 'gallery');
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND policyname = 'Public Access for Chat Attachments'
    ) THEN
        CREATE POLICY "Public Access for Chat Attachments" ON storage.objects FOR SELECT USING (bucket_id = 'chat-attachments');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND policyname = 'Public Access for Avatars'
    ) THEN
        CREATE POLICY "Public Access for Avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
    END IF;
END $$;
