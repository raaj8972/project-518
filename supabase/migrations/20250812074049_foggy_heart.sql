/*
  # Update sponsorship settings for PDF upload

  1. Changes
    - Update brochure_url column to handle uploaded PDF files
    - Keep existing data intact
    - No breaking changes to existing functionality

  2. Notes
    - Existing URL-based brochures will continue to work
    - New uploads will use Supabase storage
*/

-- No schema changes needed as brochure_url can handle both URLs and storage URLs
-- The application logic will handle the difference between external URLs and storage URLs