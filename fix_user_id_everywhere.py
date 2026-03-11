import re

with open('fix_all_schema.sql', 'r') as f:
    content = f.read()

# Let's do a massive regex replacement: anywhere it says `id uuid REFERENCES auth.users(id)` change to `user_id uuid REFERENCES auth.users(id)`
content = re.sub(
    r'\bid\s+uuid(\s+primary\s+key)?\s+references\s+auth\.users\(id\)',
    r'user_id uuid\1 references auth.users(id)',
    content,
    flags=re.IGNORECASE
)

# And similarly `id uuid REFERENCES admin_users(user_id)` to `user_id uuid REFERENCES admin_users(user_id)`
content = re.sub(
    r'\bid\s+uuid(\s+primary\s+key)?\s+references\s+(?:public\.)?admin_users\(user_id\)',
    r'user_id uuid\1 references public.admin_users(user_id)',
    content,
    flags=re.IGNORECASE
)

# And similarly for `admin_permissions` if they reference a user_id
content = re.sub(
    r'\bid\s+uuid(\s+primary\s+key)?\s+references\s+(?:public\.)?admin_permissions\(user_id\)',
    r'user_id uuid\1 references public.admin_permissions(user_id)',
    content,
    flags=re.IGNORECASE
)

with open('fix_all_schema.sql', 'w') as f:
    f.write(content)

print("Mass replacement of id -> user_id for auth.users references complete.")
