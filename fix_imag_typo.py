import re

with open('feb28_schema.sql', 'r') as f:
    text = f.read()

# Replace the "imag" typo with the actual event_coordinators schema
proper_scheme = """CREATE TABLE IF NOT EXISTS public.event_coordinators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id integer REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  role text DEFAULT 'Coordinator',
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.event_coordinators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to event_coordinators"
  ON public.event_coordinators FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage event_coordinators"
  ON public.event_coordinators FOR ALL TO authenticated USING (true) WITH CHECK (true);"""

text = re.sub(r'-- ========= Source Migration: 20250914101000_event_coordinators\.sql =========\s*imag', '-- ========= Source Migration: 20250914101000_event_coordinators.sql =========\n' + proper_scheme, text)

with open('feb28_schema.sql', 'w') as f:
    f.write(text)

print("Fixed 'imag' typo.")
