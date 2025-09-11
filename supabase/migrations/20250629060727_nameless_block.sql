/*
  # Add documents storage bucket for PDF uploads

  1. Storage Bucket
    - `documents` - For PDF files like sponsorship brochures

  2. Storage Policies
    - Allow public read access to documents
    - Allow authenticated users to upload/update/delete documents
*/

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for documents bucket
CREATE POLICY "Public read access for documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'documents' AND auth.role() = 'authenticated');