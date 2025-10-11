-- Add per-event participant-type quotas so each event can have different limits
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS registration_participant_quotas jsonb DEFAULT NULL;

COMMENT ON COLUMN public.events.registration_participant_quotas IS 'Per-event map of participant_type => max approved registrations (0 = closed, missing/null = unlimited). Overrides site_settings.registration_participant_quotas when present.';
