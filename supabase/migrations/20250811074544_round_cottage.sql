/*
  # Storage Buckets Setup Instructions

  This migration provides the SQL commands to create the required storage buckets
  for the RICORRENZA 2025 application.

  ## Required Storage Buckets
  The following buckets need to be created in your Supabase project:
  
  1. `band-images` - For Home Bound Band member photos
  2. `event-images` - For event photos and thumbnails  
  3. `faculty-images` - For faculty head profile photos
  4. `gallery-images` - For gallery photos and memories
  5. `team-images` - For core team member photos
  6. `sponsor-logos` - For sponsor company logos
  7. `documents` - For PDF documents and brochures

  ## Manual Setup Required
  Since storage buckets cannot be created via SQL migrations, you need to:
  
  1. Go to your Supabase project dashboard
  2. Navigate to Storage section
  3. Create each bucket listed above
  4. Set appropriate policies for each bucket

  ## Storage Policies
  For each bucket, you'll need policies that allow:
  - Authenticated users to upload files
  - Public read access to files
  - Authenticated users to delete their own uploads
*/

-- This is a documentation-only migration
-- Storage buckets must be created manually in the Supabase dashboard

-- Example policies that should be applied to each storage bucket:
-- (These need to be set in the Supabase dashboard, not via SQL)

/*
Policy Name: "Allow authenticated uploads"
Operation: INSERT
Target roles: authenticated
Policy definition: true

Policy Name: "Allow public downloads" 
Operation: SELECT
Target roles: public
Policy definition: true

Policy Name: "Allow authenticated deletes"
Operation: DELETE  
Target roles: authenticated
Policy definition: true
*/

-- Create a table to track storage setup status
CREATE TABLE IF NOT EXISTS storage_setup_status (
  id integer PRIMARY KEY DEFAULT 1,
  buckets_created boolean DEFAULT false,
  policies_configured boolean DEFAULT false,
  setup_notes text DEFAULT 'Storage buckets need to be created manually in Supabase dashboard',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE storage_setup_status ENABLE ROW LEVEL SECURITY;

-- Allow public read access to setup status
CREATE POLICY "Allow public read access to storage_setup_status"
  ON storage_setup_status
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to update setup status
CREATE POLICY "Allow authenticated users to update storage_setup_status"
  ON storage_setup_status
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert initial status record
INSERT INTO storage_setup_status (id, buckets_created, policies_configured, setup_notes)
VALUES (1, false, false, 'Please create the following storage buckets in your Supabase dashboard: band-images, event-images, faculty-images, gallery-images, team-images, sponsor-logos, documents')
ON CONFLICT (id) DO NOTHING;