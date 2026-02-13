-- Add subcategory column to gallery_images for finer classification
-- e.g. Category = "Culture Fest", Subcategory = "Award Ceremony"
ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS subcategory TEXT DEFAULT '' NOT NULL;
