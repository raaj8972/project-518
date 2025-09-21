-- Seed a default Sports Organising Committee if missing (idempotent)
-- Safe to run multiple times

BEGIN;

DO $$
DECLARE v_id bigint;
BEGIN
  SELECT id INTO v_id
  FROM public.sports_committees
  WHERE lower(trim(name)) IN ('sports organising committee','sports organizing committee')
  LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO public.sports_committees (name, description, color, order_position, enabled)
    VALUES (
      'Sports Organising Committee',
      'The organising team overseeing all sports operations and logistics.',
      '#10B981',
      1,
      true
    );
  END IF;
END $$;

-- Let PostgREST reload schemas if needed
NOTIFY pgrst, 'reload schema';

COMMIT;
