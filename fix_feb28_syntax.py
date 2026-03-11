import re

with open('feb28_schema.sql', 'r') as f:
    text = f.read()

# 1. Fix `create policy if not exists` (we did this, but let's be sure)
text = re.sub(r'(?i)CREATE\s+POLICY\s+IF\s+NOT\s+EXISTS', 'CREATE POLICY', text)

# 2. Fix `DROP POLICY IF EXISTS "name" ON table` -> `ON public.table` or just ensure it's valid.
# Actually, `ON table` is valid if search_path includes public. But another error from before was `ON storage;` which should be `storage.objects`
text = re.sub(r'(?i)ON\s+storage;', 'ON storage.objects;', text)

# 3. Look at line 6644 from the user's cursor.
# `select id, row_number() over (order by coalesce(created_at, now()), id) as rn from public.events ) sub`
# Wait, look at line 6644 in previous output:
# 6642:   select id, row_number() over (order by coalesce(created_at, now()), id) as rn
# 6643:   from public.events
# 6644:   
# 6645: ) sub
# This is perfectly valid SQL:
# update public.events e set display_order = sub.rn from ( select ... ) sub where e.id = sub.id

# 4. We need to check for the previous errors: `id` vs `user_id` inside admin tracking tables.
# Oh! Because we reverted to February 28th, ALL THE user_id ERRORS ARE BACK!
# The admin_users table in Feb 28th STILL used `id` instead of `user_id`!
# Let's apply our clean `id` to `user_id` patches to the Feb 28 script too.

text = re.sub(
    r'(CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(?:public\.)?admin_users\s*\(\s*)id',
    r'\1user_id',
    text,
    flags=re.IGNORECASE
)

text = re.sub(
    r'(CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(?:public\.)?admin_permissions\s*\(\s*)id',
    r'\1user_id',
    text,
    flags=re.IGNORECASE
)

text = re.sub(
    r'(CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(?:public\.)?admin_sessions\s*\(\s*)id',
    r'\1user_id',
    text,
    flags=re.IGNORECASE
)

def add_user_id_to_coordinators(match):
    return match.group(0) + "\n  user_id uuid REFERENCES auth.users(id),"

text = re.sub(
    r'CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(?:public\.)?event_coordinators\s*\(',
    add_user_id_to_coordinators,
    text,
    flags=re.IGNORECASE
)

text = re.sub(
    r'\bid\s+uuid\s+primary\s+key\s+references\s+auth\.users\(id\)',
    r'user_id uuid primary key references auth.users(id)',
    text,
    flags=re.IGNORECASE
)

text = re.sub(
    r'\bid\s+uuid\s+references\s+auth\.users\(id\)',
    r'user_id uuid references auth.users(id)',
    text,
    flags=re.IGNORECASE
)

# Fix the DO block quote error we found earlier that was reverted when we regenerated
new_block = """-- Create a public SELECT policy if missing
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'events'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'events'
        AND policyname = 'Allow public read access to events'
    ) THEN
      EXECUTE $policy$
        CREATE POLICY "Allow public read access to events"
        ON public.events
        FOR SELECT
        TO anon, authenticated
        USING (true)
      $policy$;
    END IF;
  END IF;
END $$;"""

text = re.sub(r'-- Create a public SELECT policy if missing.*?END \$\$;', new_block, text, flags=re.DOTALL)


with open('feb28_schema.sql', 'w') as f:
    f.write(text)

print("Applied syntax fixes and user_id columns to Feb 28 script.")
