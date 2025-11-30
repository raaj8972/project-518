-- Ensure memberships and auditions tables exist with all required columns
-- Safe to run multiple times

-- ============================================
-- MEMBERSHIPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.memberships (
  id text PRIMARY KEY DEFAULT ('MEM-'||extract(epoch from now())::bigint::text||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6))),
  participant_type text NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  college_department text NOT NULL,
  motivation text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'accepted')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add missing columns if table already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='memberships' AND column_name='participant_type') THEN
    ALTER TABLE public.memberships ADD COLUMN participant_type text NOT NULL DEFAULT '1st Year';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='memberships' AND column_name='motivation') THEN
    ALTER TABLE public.memberships ADD COLUMN motivation text;
  END IF;
END$$;

-- ============================================
-- AUDITIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.auditions (
  id text PRIMARY KEY DEFAULT ('AUD-'||extract(epoch from now())::bigint::text||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6))),
  participant_type text NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  instrument_role text NOT NULL,
  experience_motivation text,
  portfolio_link text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'contacted')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add missing columns if table already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='auditions' AND column_name='participant_type') THEN
    ALTER TABLE public.auditions ADD COLUMN participant_type text NOT NULL DEFAULT '1st Year';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='auditions' AND column_name='experience_motivation') THEN
    ALTER TABLE public.auditions ADD COLUMN experience_motivation text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='auditions' AND column_name='portfolio_link') THEN
    ALTER TABLE public.auditions ADD COLUMN portfolio_link text;
  END IF;
END$$;

-- ============================================
-- RLS POLICIES - Allow public inserts
-- ============================================

-- Enable RLS
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public insert memberships" ON public.memberships;
DROP POLICY IF EXISTS "Allow admin full access memberships" ON public.memberships;
DROP POLICY IF EXISTS "Allow public insert auditions" ON public.auditions;
DROP POLICY IF EXISTS "Allow admin full access auditions" ON public.auditions;

-- Memberships: Allow anyone to insert
CREATE POLICY "Allow public insert memberships" 
  ON public.memberships
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Memberships: Allow admins to view/update/delete
CREATE POLICY "Allow admin full access memberships"
  ON public.memberships
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Auditions: Allow anyone to insert
CREATE POLICY "Allow public insert auditions"
  ON public.auditions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Auditions: Allow admins to view/update/delete
CREATE POLICY "Allow admin full access auditions"
  ON public.auditions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT INSERT ON public.memberships TO anon, authenticated;
GRANT ALL ON public.memberships TO authenticated;
GRANT INSERT ON public.auditions TO anon, authenticated;
GRANT ALL ON public.auditions TO authenticated;
