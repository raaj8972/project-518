-- Create allowed_admins table for whitelisting
CREATE TABLE IF NOT EXISTS public.allowed_admins (
    id TEXT PRIMARY KEY, -- usually email_gmail_com format
    email TEXT NOT NULL UNIQUE,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.allowed_admins ENABLE ROW LEVEL SECURITY;

-- Policy: Only owners can manage whitelist
-- We assume "role" exists in admin_users or permissions, but for bootstrap, 
-- we can allow the master email or any existing owner.
CREATE POLICY "Owners can manage whitelist" 
ON public.allowed_admins
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE user_id = auth.uid()::text 
        AND role = 'owner'
    )
    OR (auth.jwt()->>'email' = 'ricorrenza.theiqcityfestival@gmail.com')
);

-- Policy: Authenticated users can read the whitelist (to check their own status)
CREATE POLICY "Authenticated users can read whitelist" 
ON public.allowed_admins
FOR SELECT 
TO authenticated
USING (true);

-- Insert the system owner by default
INSERT INTO public.allowed_admins (id, email, role)
VALUES ('ricorrenza_theiqcityfestival_gmail_com', 'ricorrenza.theiqcityfestival@gmail.com', 'owner')
ON CONFLICT (id) DO NOTHING;
