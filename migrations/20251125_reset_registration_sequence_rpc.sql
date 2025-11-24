-- Function to reset the registration ID sequence (RICO-1, RICO-2...)
-- Usage: supabase.rpc('reset_registration_id_sequence')

CREATE OR REPLACE FUNCTION reset_registration_id_sequence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reset the sequence to start from 1 again
  ALTER SEQUENCE registration_id_seq RESTART WITH 1;
END;
$$;
