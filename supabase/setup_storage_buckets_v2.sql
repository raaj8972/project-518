-- Require the versioned security migration before any legacy bucket setup.
DO $$ BEGIN IF to_regprocedure('public.can_write_storage_object(text,text)') IS NULL THEN RAISE EXCEPTION 'Apply the versioned security migrations first'; END IF; END $$;

-- 1. Create buckets (Safe approach)
-- This tries to insert and ignores if already exists
-- If this fails, the buckets should be created manually in the UI
DO $$
BEGIN
    -- Create band-images
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('band-images', 'band-images', true)
    ON CONFLICT (id) DO NOTHING;

    -- Create event-images
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('event-images', 'event-images', true)
    ON CONFLICT (id) DO NOTHING;

    -- Create pdf-watermarks
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('pdf-watermarks', 'pdf-watermarks', true)
    ON CONFLICT (id) DO NOTHING;

    -- Create public-content
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('public-content', 'public-content', true)
    ON CONFLICT (id) DO NOTHING;

    -- Create registration-photos
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('registration-photos', 'registration-photos', false)
    ON CONFLICT (id) DO NOTHING;

    -- Create sponsor-logos
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('sponsor-logos', 'sponsor-logos', true)
    ON CONFLICT (id) DO NOTHING;

    -- Create team-images
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('team-images', 'team-images', true)
    ON CONFLICT (id) DO NOTHING;
END $$;


-- Access policies and upload limits are managed exclusively by versioned migrations.
