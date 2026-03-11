import re

with open('fix_all_schema.sql', 'r') as f:
    content = f.read()

aggressive_block = """
DO $$
BEGIN
  -- Handle admin_users
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_users') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'id') THEN
          ALTER TABLE public.admin_users RENAME COLUMN id TO user_id;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'user_id') THEN
          ALTER TABLE public.admin_users ADD COLUMN user_id uuid;
      END IF;
  END IF;

  -- Handle admin_permissions
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_permissions') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_permissions' AND column_name = 'id') THEN
          ALTER TABLE public.admin_permissions RENAME COLUMN id TO user_id;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_permissions' AND column_name = 'user_id') THEN
          ALTER TABLE public.admin_permissions ADD COLUMN user_id uuid;
      END IF;
  END IF;

  -- Handle admin_sessions
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_sessions') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_sessions' AND column_name = 'id') THEN
          ALTER TABLE public.admin_sessions RENAME COLUMN id TO user_id;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_sessions' AND column_name = 'user_id') THEN
          ALTER TABLE public.admin_sessions ADD COLUMN user_id uuid;
      END IF;
  END IF;

  -- Handle event_coordinators
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'event_coordinators') THEN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_coordinators' AND column_name = 'user_id') THEN
          ALTER TABLE public.event_coordinators ADD COLUMN user_id uuid references auth.users(id);
      END IF;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
"""

# Replace the previous DO block
content = re.sub(r'DO \$\$\nBEGIN\n  -- Handle admin_users.*?END \$\$;', aggressive_block, content, flags=re.DOTALL)

with open('fix_all_schema.sql', 'w') as f:
    f.write(content)

print("Injected aggressive user_id patch with event_coordinators.")
