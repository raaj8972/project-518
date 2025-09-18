-- Add linkage columns to schedule_events for events and guest artists (idempotent pattern)
DO $$ BEGIN
    -- event_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='schedule_events' AND column_name='event_id'
    ) THEN
        ALTER TABLE public.schedule_events ADD COLUMN event_id integer REFERENCES public.events(id) ON DELETE SET NULL;
    END IF;
    -- guest_artist_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='schedule_events' AND column_name='guest_artist_id'
    ) THEN
        ALTER TABLE public.schedule_events ADD COLUMN guest_artist_id integer REFERENCES public.guest_artists(id) ON DELETE SET NULL;
    END IF;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'schedule_events linkage migration encountered an error: %', SQLERRM;
END $$;

-- Optional indexes (avoid duplicate creation)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'idx_schedule_events_event_id' AND n.nspname = 'public'
    ) THEN
        CREATE INDEX idx_schedule_events_event_id ON public.schedule_events(event_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'idx_schedule_events_guest_artist_id' AND n.nspname = 'public'
    ) THEN
        CREATE INDEX idx_schedule_events_guest_artist_id ON public.schedule_events(guest_artist_id);
    END IF;
END $$;