-- Migration: add registration_institution_visible to site_settings
-- Date: 2025-10-11

BEGIN;

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS registration_institution_visible boolean DEFAULT true;

COMMIT;
