-- Add faces_indexed column to gallery_images to track scanning status
ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS faces_indexed BOOLEAN DEFAULT FALSE;

-- Update search_gallery_faces to be more robust (optional refinement)
-- (Already created in previous turn, just ensuring persistence)
