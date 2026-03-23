ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS registration_institution_visible BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS registration_institution_optional BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS batch_options JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS registration_participant_types JSONB DEFAULT '["1st Year","2nd Year","3rd Year","4th Year"]'::jsonb,
  ADD COLUMN IF NOT EXISTS registration_participant_quotas JSONB DEFAULT '{}'::jsonb;

-- Notify Supabase to flush the schema cache
NOTIFY pgrst, 'reload schema';
