-- Add updated_at column to allowed_admins table to support dualDb dualUpsert operations
ALTER TABLE public.allowed_admins 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();
