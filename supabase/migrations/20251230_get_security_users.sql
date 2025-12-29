-- Function to get public list of security users (for login dropdown)
CREATE OR REPLACE FUNCTION public.get_public_security_users()
RETURNS TABLE (
  username TEXT,
  full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    su.username,
    su.full_name
  FROM public.security_users su
  WHERE su.is_active = true
  ORDER BY su.full_name ASC;
END;
$$;

-- Grant execute to public (anon)
GRANT EXECUTE ON FUNCTION public.get_public_security_users() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_security_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_security_users() TO service_role;
