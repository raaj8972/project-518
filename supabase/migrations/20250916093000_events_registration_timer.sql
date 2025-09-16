-- Add optional registration timer fields to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS registration_timer_enabled boolean DEFAULT false;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS registration_opens_at timestamptz NULL;

COMMENT ON COLUMN public.events.registration_timer_enabled IS 'If true, UI can show countdown until registration_opens_at and "LIVE NOW" after that time.';
COMMENT ON COLUMN public.events.registration_opens_at IS 'Timestamp when registration should be considered live for UX (optional).';