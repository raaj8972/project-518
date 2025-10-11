-- Add site-level registration quotas and Institution visibility toggle
-- Date: 2025-10-11

BEGIN;

-- Site-wide participant-type quotas (fallback when event-specific quotas are not set)
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS registration_participant_quotas jsonb DEFAULT NULL;

COMMENT ON COLUMN public.site_settings.registration_participant_quotas IS 'Site-wide map of participant_type => max approved registrations (0 = closed, missing/null = unlimited). Used as fallback when events.registration_participant_quotas is not set.';

-- Global toggle to show/hide Institution/College field in Registration Modal
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS registration_institution_visible boolean DEFAULT true;

COMMENT ON COLUMN public.site_settings.registration_institution_visible IS 'If false, hide the Institution/College field for viewers. Combine with registration_institution_optional to make it optional when visible.';

COMMIT;
