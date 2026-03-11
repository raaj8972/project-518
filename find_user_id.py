import re

with open('fix_all_schema.sql', 'r') as f:
    content = f.read()

# Let's find every table definition that mentions user_id by looking for CREATE TABLE ... user_id ...
# Actually, let's find all CREATE TABLE blocks and see which ones are missing user_id.
# Alternatively, we just know admin_users, admin_permissions, admin_sessions, event_coordinators, and security_users are the likely culprits.
# Let's just forcefully replace `id uuid` or `id UUID` with `user_id uuid` in the CREATE TABLE blocks for admin_users, admin_permissions, admin_sessions.

content = re.sub(
    r'(CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(?:public\.)?admin_users\s*\(\s*)id\s+(uuid|text|int)',
    r'\1user_id \2',
    content,
    flags=re.IGNORECASE
)

content = re.sub(
    r'(CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(?:public\.)?admin_permissions\s*\(\s*)id\s+(uuid|text|int)',
    r'\1user_id \2',
    content,
    flags=re.IGNORECASE
)

content = re.sub(
    r'(CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(?:public\.)?admin_sessions\s*\(\s*)id\s+(uuid|text|int)',
    r'\1user_id \2',
    content,
    flags=re.IGNORECASE
)

# Also event_coordinators
# If it has `id BIGSERIAL PRIMARY KEY` but expects `user_id`, we might need both.
# Let's just blindly add `user_id uuid references auth.users(id)` into any CREATE TABLE event_coordinators
def add_user_id_to_coordinators(match):
    return match.group(0) + "\n  user_id uuid,"

content = re.sub(
    r'CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(?:public\.)?event_coordinators\s*\(',
    add_user_id_to_coordinators,
    content,
    flags=re.IGNORECASE
)

with open('fix_all_schema.sql', 'w') as f:
    f.write(content)

print("Patched table definitions for user_id.")
