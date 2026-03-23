-- Migration to add updated_at column to legacy tables
-- These tables were created in early migrations without updated_at column
-- but now the dualDb.ts layer expects it for all write operations.

DO $$ BEGIN
    -- schedule_days
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='schedule_days' AND column_name='updated_at') THEN
        ALTER TABLE public.schedule_days ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- schedule_events
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='schedule_events' AND column_name='updated_at') THEN
        ALTER TABLE public.schedule_events ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- events
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='updated_at') THEN
        ALTER TABLE public.events ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- event_categories
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_categories' AND column_name='updated_at') THEN
        ALTER TABLE public.event_categories ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- gallery_images
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gallery_images' AND column_name='updated_at') THEN
        ALTER TABLE public.gallery_images ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- sponsors
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sponsors' AND column_name='updated_at') THEN
        ALTER TABLE public.sponsors ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- registrations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='registrations' AND column_name='updated_at') THEN
        ALTER TABLE public.registrations ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

END $$;

-- Populate updated_at with created_at where available to maintain consistency
UPDATE public.schedule_days SET updated_at = created_at WHERE updated_at IS NULL OR updated_at = NOW();
UPDATE public.schedule_events SET updated_at = created_at WHERE updated_at IS NULL OR updated_at = NOW();
UPDATE public.events SET updated_at = created_at WHERE updated_at IS NULL OR updated_at = NOW();
UPDATE public.event_categories SET updated_at = created_at WHERE updated_at IS NULL OR updated_at = NOW();
UPDATE public.gallery_images SET updated_at = created_at WHERE updated_at IS NULL OR updated_at = NOW();
UPDATE public.sponsors SET updated_at = created_at WHERE updated_at IS NULL OR updated_at = NOW();
UPDATE public.registrations SET updated_at = created_at WHERE updated_at IS NULL OR updated_at = NOW();

-- Reload schema to update PostgREST cache
NOTIFY pgrst, 'reload schema';
