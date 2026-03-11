import re

with open('fix_all_schema.sql', 'r') as f:
    content = f.read()

# Replace `setval('public.registration_id_seq', v_max, true)` with logic that safely handles v_max=0
safe_setval = """
  IF v_max > 0 THEN
    PERFORM setval('public.registration_id_seq', v_max, true);
  ELSE
    PERFORM setval('public.registration_id_seq', 1, false);
  END IF;
  """

content = re.sub(r'PERFORM setval\s*\(\s*\'public\.registration_id_seq\'\s*,\s*v_max\s*,\s*true\s*\)\s*;', safe_setval, content)

with open('fix_all_schema.sql', 'w') as f:
    f.write(content)

print("Fixed the setval sequence bug!")
