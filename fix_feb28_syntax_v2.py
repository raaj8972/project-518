import re

with open('feb28_schema.sql', 'r') as f:
    text = f.read()

# Fix 1: "CREATE POLICY IF NOT EXISTS" is invalid postgres syntax
text = re.sub(r'(?i)CREATE\s+POLICY\s+IF\s+NOT\s+EXISTS', 'CREATE POLICY', text)

# Fix 2: Nested DO blocks (DO $$ ... EXECUTE $$ ... $$ END $$)
# This caused the syntax error around 4033. Let's make sure it's fully replaced.
bad_event_block = """DO $$
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
      EXECUTE $$
        CREATE POLICY "Allow public read access to events"
        ON public.events
        FOR SELECT
        TO anon, authenticated
        USING (true)
      $$;
    END IF;
  END IF;
END $$;"""

good_event_block = """DO $$
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

text = text.replace(bad_event_block, good_event_block)


# Fix 3: Make sure any "CREATE POLICY ... ON storage;" is "ON storage.objects"
text = re.sub(r'(?i)(CREATE\s+POLICY\s+.*?ON\s+)storage\s+(FOR|TO|USING|WITH)', r'\1storage.objects \2', text)


# Fix 4: id vs user_id from previous admin table issues
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


with open('feb28_schema.sql', 'w') as f:
    f.write(text)

print("Applied strict syntax fixes via regex successfully.")
