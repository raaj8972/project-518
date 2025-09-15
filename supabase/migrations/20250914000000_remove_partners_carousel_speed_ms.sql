-- Migration: Drop unused partners_carousel_speed_ms from homepage_settings
-- Date: 2025-09-14

-- Note: Ensure no application code depends on this column before applying.
-- This migration is irreversible in this file; to revert, you can add the column back manually.

ALTER TABLE public.homepage_settings
  DROP COLUMN IF EXISTS partners_carousel_speed_ms;
