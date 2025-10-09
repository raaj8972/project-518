-- Migration: add registration-related columns to site_settings
-- Date: 2025-10-10

BEGIN;

-- participant types (array of text)
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS registration_participant_types text[] DEFAULT ARRAY['1st Year','2nd Year','3rd Year','4th Year'];

-- optional institution field flag
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS registration_institution_optional boolean DEFAULT false;

-- photo defaults
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS registration_photo_default_required boolean DEFAULT false;

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS registration_photo_default_label text DEFAULT NULL;

-- placeholders for inputs (jsonb object)
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS registration_field_placeholders jsonb DEFAULT (
    jsonb_build_object(
      'full_name', 'Enter full name',
      'email', 'user@domain.com',
      'phone', 'Contact number',
      'college', 'Your college or institution'
    )
  );

-- optional form fields JSON (array of objects describing fields)
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS registration_form_fields jsonb DEFAULT NULL;

COMMIT;
