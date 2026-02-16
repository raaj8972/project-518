-- Add faces_indexed column to gallery_images table
ALTER TABLE gallery_images 
ADD COLUMN IF NOT EXISTS faces_indexed BOOLEAN DEFAULT FALSE;

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_gallery_images_faces_indexed ON gallery_images(faces_indexed);
