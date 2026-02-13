-- Add unique constraint to gallery_images.src to allow upserts
-- and prevent duplicate images (especially for Google Drive integration)

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'gallery_images_src_key'
    ) THEN
        ALTER TABLE gallery_images ADD CONSTRAINT gallery_images_src_key UNIQUE (src);
    END IF;
END $$;
