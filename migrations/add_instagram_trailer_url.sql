-- Migration: Add Instagram Trailer & Aftermovie URLs to homepage_settings
-- Run this in your Supabase SQL editor

-- TRAILER SECTION
-- Add instagram_trailer_url column
ALTER TABLE homepage_settings 
ADD COLUMN IF NOT EXISTS instagram_trailer_url TEXT;

-- Add instagram_trailer_enabled column
ALTER TABLE homepage_settings 
ADD COLUMN IF NOT EXISTS instagram_trailer_enabled BOOLEAN DEFAULT false;

-- Add instagram_trailer_title column
ALTER TABLE homepage_settings 
ADD COLUMN IF NOT EXISTS instagram_trailer_title TEXT DEFAULT 'OFFICIAL TRAILER';

-- Add instagram_trailer_subtitle column
ALTER TABLE homepage_settings 
ADD COLUMN IF NOT EXISTS instagram_trailer_subtitle TEXT DEFAULT 'Watch our official event trailer';

-- AFTERMOVIE SECTION
-- Add instagram_aftermovie_url column
ALTER TABLE homepage_settings 
ADD COLUMN IF NOT EXISTS instagram_aftermovie_url TEXT;

-- Add instagram_aftermovie_enabled column
ALTER TABLE homepage_settings 
ADD COLUMN IF NOT EXISTS instagram_aftermovie_enabled BOOLEAN DEFAULT false;

-- Add instagram_aftermovie_title column
ALTER TABLE homepage_settings 
ADD COLUMN IF NOT EXISTS instagram_aftermovie_title TEXT DEFAULT 'EVENT AFTERMOVIE';

-- Add instagram_aftermovie_subtitle column
ALTER TABLE homepage_settings 
ADD COLUMN IF NOT EXISTS instagram_aftermovie_subtitle TEXT DEFAULT 'Relive the best moments from our event';

-- Add comments for documentation
COMMENT ON COLUMN homepage_settings.instagram_trailer_url IS 'Instagram reel/post URL for the official trailer';
COMMENT ON COLUMN homepage_settings.instagram_trailer_enabled IS 'Enable/disable Instagram trailer section on home page';
COMMENT ON COLUMN homepage_settings.instagram_trailer_title IS 'Title for the trailer section';
COMMENT ON COLUMN homepage_settings.instagram_trailer_subtitle IS 'Subtitle/description for the trailer section';

COMMENT ON COLUMN homepage_settings.instagram_aftermovie_url IS 'Instagram reel/post URL for the event aftermovie';
COMMENT ON COLUMN homepage_settings.instagram_aftermovie_enabled IS 'Enable/disable Instagram aftermovie section on home page';
COMMENT ON COLUMN homepage_settings.instagram_aftermovie_title IS 'Title for the aftermovie section';
COMMENT ON COLUMN homepage_settings.instagram_aftermovie_subtitle IS 'Subtitle/description for the aftermovie section';

/* Verify columns were added successfully */
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'homepage_settings' 
  AND column_name IN (
    'instagram_trailer_url',
    'instagram_trailer_enabled',
    'instagram_trailer_title',
    'instagram_trailer_subtitle',
    'instagram_aftermovie_url',
    'instagram_aftermovie_enabled',
    'instagram_aftermovie_title',
    'instagram_aftermovie_subtitle'
  )
ORDER BY column_name;
