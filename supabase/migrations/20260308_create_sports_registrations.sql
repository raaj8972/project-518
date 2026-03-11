-- Create sports_registrations table
CREATE TABLE IF NOT EXISTS public.sports_registrations (
    id BIGSERIAL PRIMARY KEY,
    sport_id BIGINT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    year_or_class TEXT,
    institution TEXT,
    position_preference TEXT,
    experience TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sports_registrations ENABLE ROW LEVEL SECURITY;

-- Allow public inserts
CREATE POLICY "Allow public sports registration" ON public.sports_registrations
    FOR INSERT WITH CHECK (true);

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated read sports registration" ON public.sports_registrations
    FOR SELECT USING (auth.role() = 'authenticated');

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
