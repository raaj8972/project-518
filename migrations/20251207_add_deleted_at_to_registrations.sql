-- Add deleted_at column for soft deletes
ALTER TABLE public.registrations 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Optional: Index for filtering active/deleted items efficiently
CREATE INDEX IF NOT EXISTS idx_registrations_deleted_at ON public.registrations(deleted_at);
