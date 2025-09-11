/*
  # Create PDF storage bucket for sponsorship documents

  1. Storage Setup
    - Create `pdf` bucket for PDF document storage
    - Configure bucket for public read access
    - Set file size limits and allowed file types

  2. Security Policies
    - Enable public read access for downloading brochures
    - Allow authenticated users to upload, update, and delete PDFs
    - Restrict file types to PDF only

  3. Bucket Configuration
    - Public bucket for easy access to sponsorship brochures
    - Organized folder structure for different document types
*/

-- Create the pdf storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdf',
  'pdf',
  true,
  10485760, -- 10MB limit
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the storage.objects table for the pdf bucket
CREATE POLICY "Public read access for pdf bucket"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'pdf');

CREATE POLICY "Authenticated users can upload to pdf bucket"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'pdf');

CREATE POLICY "Authenticated users can update pdf bucket objects"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'pdf')
  WITH CHECK (bucket_id = 'pdf');

CREATE POLICY "Authenticated users can delete from pdf bucket"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'pdf');