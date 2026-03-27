-- Add permissions jsonb column to allowed_admins table to allow pre-configuring access matrix
ALTER TABLE public.allowed_admins 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;
