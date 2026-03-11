-- Create sequence for Annual Sports Registration IDs
CREATE SEQUENCE IF NOT EXISTS annual_sports_reg_id_seq;

-- Create function to generate formatted registration ID
CREATE OR REPLACE FUNCTION generate_annual_sports_reg_id()
RETURNS text AS $$
BEGIN
  RETURN 'ANN-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('annual_sports_reg_id_seq')::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Create Annual Sports Events table
CREATE TABLE IF NOT EXISTS public.annual_sports_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text,
  description text,
  image_url text,
  rules_url text,
  registration_open boolean DEFAULT true,
  min_participants integer DEFAULT 1,
  max_participants integer DEFAULT 1,
  fee numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Annual Sports Registrations table
CREATE TABLE IF NOT EXISTS public.annual_sports_registrations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reg_id text UNIQUE DEFAULT generate_annual_sports_reg_id(),
  event_id uuid REFERENCES public.annual_sports_events(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  department text,
  year text,
  roll_no text,
  status text DEFAULT 'pending',
  payment_status text DEFAULT 'pending',
  photo_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.annual_sports_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_sports_registrations ENABLE ROW LEVEL SECURITY;

-- Policies for annual_sports_events
CREATE POLICY "Public can view annual sports events" ON public.annual_sports_events
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage annual sports events" ON public.annual_sports_events
  FOR ALL USING (
    (SELECT role FROM admin_users WHERE user_id = auth.uid()) IN ('admin', 'owner', 'council')
  );

-- Policies for annual_sports_registrations
CREATE POLICY "Public can insert annual sports registrations" ON public.annual_sports_registrations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own annual registrations" ON public.annual_sports_registrations
  FOR SELECT USING (
    auth.jwt() ->> 'email' = email OR
    (SELECT role FROM admin_users WHERE user_id = auth.uid()) IN ('admin', 'owner', 'council')
  );

CREATE POLICY "Admins can manage annual sports registrations" ON public.annual_sports_registrations
  FOR ALL USING (
    (SELECT role FROM admin_users WHERE user_id = auth.uid()) IN ('admin', 'owner', 'council')
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_annual_sports_events_updated_at
    BEFORE UPDATE ON annual_sports_events
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_annual_sports_registrations_updated_at
    BEFORE UPDATE ON annual_sports_registrations
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
