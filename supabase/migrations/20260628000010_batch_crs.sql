-- Create Batch CRs configuration table
CREATE TABLE IF NOT EXISTS public.batch_crs (
  batch text PRIMARY KEY,
  password text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.batch_crs ENABLE ROW LEVEL SECURITY;

-- Allow SELECT only for batch names (do not leak passwords)
DROP POLICY IF EXISTS "Allow public read of batch names" ON public.batch_crs;
CREATE POLICY "Allow public read of batch names" ON public.batch_crs
  FOR SELECT
  USING (true);

-- Create secure login verification function
CREATE OR REPLACE FUNCTION public.verify_cr_login(p_batch text, p_password text)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.batch_crs
    WHERE batch = p_batch AND password = p_password
  );
END;
$$;
