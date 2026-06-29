CREATE OR REPLACE FUNCTION public.get_function_definition(p_name text)
RETURNS text
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_def text;
BEGIN
  SELECT prosrc INTO v_def FROM pg_proc WHERE proname = p_name;
  RETURN v_def;
END;
$$;
