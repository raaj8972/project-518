import re

with open('fix_all_schema.sql', 'r') as f:
    content = f.read()

# Instead of injecting at the top, let's inject a safe rename block right after the first CREATE TABLE admin_users doesn't execute (or just put it at the very top of the script).
# We can use a DO block to check if `id` exists inside `admin_users` and rename it to `user_id`.

rename_block = """
DO $$
BEGIN
  -- Check and rename 'id' to 'user_id' in admin_users if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_users' AND column_name = 'id'
  ) THEN
    ALTER TABLE IF EXISTS public.admin_users RENAME COLUMN id TO user_id;
  END IF;

  -- Same for admin_permissions just in case
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_permissions' AND column_name = 'id'
  ) THEN
    ALTER TABLE IF EXISTS public.admin_permissions RENAME COLUMN id TO user_id;
  END IF;
  
  -- Check if admin_users doesn't have role column (added later in the project)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_users' AND column_name = 'role'
  ) THEN
    ALTER TABLE IF EXISTS public.admin_users ADD COLUMN role text DEFAULT 'admin';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Safe fallback
END $$;
"""

# Inject at the very beginning
new_content = rename_block + "\n" + content

with open('fix_all_schema.sql', 'w') as f:
    f.write(new_content)

print("Injected admin_users id->user_id rename block.")
