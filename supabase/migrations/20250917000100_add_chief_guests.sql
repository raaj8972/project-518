/*
  # Add chief guests table and storage setup

  1. New Table
    - `chief_guests`
      - `id` (bigint, primary key, identity)
      - `name` (text, required)
      - `title` (text, required)
      - `image` (text, required) -- public URL to profile image
      - `description` (text, required) -- full bio
      - `specialty` (text, optional)
      - `achievements` (text[])
      - `social_links` (jsonb)
      - `enabled` (boolean) -- global visibility toggle
      - `is_featured` (boolean) -- reserved if later multiple chiefs supported
      - `order_position` (integer) -- for ordering if multiple in future
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - RLS enabled with public read + authenticated CRUD

  3. Storage
    - Create a bucket `chief-guest-images` in Supabase storage (manual or via dashboard)
*/

CREATE TABLE IF NOT EXISTS public.chief_guests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  title text NOT NULL,
  image text NOT NULL,
  description text NOT NULL,
  specialty text,
  achievements text[] DEFAULT '{}',
  social_links jsonb DEFAULT '{}',
  enabled boolean DEFAULT true,
  is_featured boolean DEFAULT true,
  order_position integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.chief_guests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY chief_guests_select ON public.chief_guests
  FOR SELECT USING ( true );

CREATE POLICY chief_guests_insert ON public.chief_guests
  FOR INSERT TO authenticated WITH CHECK ( true );

CREATE POLICY chief_guests_update ON public.chief_guests
  FOR UPDATE TO authenticated USING ( true ) WITH CHECK ( true );

CREATE POLICY chief_guests_delete ON public.chief_guests
  FOR DELETE TO authenticated USING ( true );

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_current_timestamp_chief_guests()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_chief_guests ON public.chief_guests;
CREATE TRIGGER set_timestamp_chief_guests
BEFORE UPDATE ON public.chief_guests
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_chief_guests();
