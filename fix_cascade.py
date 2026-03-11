import re

with open('fix_all_schema.sql', 'r') as f:
    content = f.read()

# The error says: cannot drop function has_permission(text)
# We should replace `DROP FUNCTION IF EXISTS has_permission` with `DROP FUNCTION IF EXISTS has_permission CASCADE`,
# or more generally `DROP FUNCTION IF EXISTS public.has_permission(text)` -> `... CASCADE`
# A generic regex:
content = re.sub(
    r'(DROP\s+FUNCTION\s+(IF\s+EXISTS\s+)?(public\.)?has_permission\s*\([^)]*\))\s*;',
    r'\1 CASCADE;',
    content,
    flags=re.IGNORECASE
)

# And similarly for ANY drop function just to be safe from CASCADE errors, but let's stick to the specific one or just do a generic approach:
content = re.sub(
    r'(DROP\s+FUNCTION\s+IF\s+EXISTS\s+[\w\.]+\s*\([^)]*\))\s*;',
    r'\1 CASCADE;',
    content,
    flags=re.IGNORECASE
)
content = re.sub(
    r'(DROP\s+FUNCTION\s+IF\s+EXISTS\s+[\w\.]+)\s*;',
    r'\1 CASCADE;',
    content,
    flags=re.IGNORECASE
)

with open('fix_all_schema.sql', 'w') as f:
    f.write(content)

print("Applied CASCADE to DROP FUNCTION statements.")
