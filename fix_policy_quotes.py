import re

with open('feb28_schema.sql', 'r') as f:
    text = f.read()

# Lines 4018-4041 look like:
"""
-- Create a public SELECT policy if missing
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
      EXECUTE $$
        CREATE POLICY "Allow public read access to events"
        ON public.events
        FOR SELECT
        TO anon, authenticated
        USING (true)
      $$;
    END IF;
  END IF;
END $$;
"""

# The inner $$ block conflicts with the outer DO $$ block in postgres. It needs to be a standard string or dollar quoted differently like $policy$.
# Let's replace `EXECUTE $$` with `EXECUTE $policy$` and `$$;` with `$policy$;` specifically in this block.

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

print("Fixed DO block quoting.")
