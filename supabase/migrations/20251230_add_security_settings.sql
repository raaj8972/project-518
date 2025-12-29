-- Add security settings table for controlling entry pass button visibility
CREATE TABLE IF NOT EXISTS public.security_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  entry_pass_button_enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Insert default row
INSERT INTO public.security_settings (id, entry_pass_button_enabled) 
VALUES (1, true) 
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

-- Public can read
CREATE POLICY "Public can read security settings" 
ON public.security_settings FOR SELECT 
USING (true);

-- Only admins/owners can update
CREATE POLICY "Admins can update security settings" 
ON public.security_settings FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() 
    AND (role = 'owner' OR role = 'admin')
  )
);
