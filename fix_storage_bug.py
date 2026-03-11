import re

with open('fix_all_schema.sql', 'r') as f:
    content = f.read()

# Fix the badly generated DROP POLICY statements
# Replace `ON storage;` followed by `CREATE POLICY ... ON storage.objects` or similar
# Actually, the easiest way is to just drop all the badly generated DROP POLICY lines and regenerate them properly.
content = re.sub(r'DROP POLICY IF EXISTS "[^"]+" ON [\w]+;\n', '', content)

# Now apply the CORRECT regex that handles schema.table properly
pattern = re.compile(
    r'(CREATE\s+POLICY\s+)("[^"]+"|[\w]+)(\s+ON\s+)([\w\.]+)',
    re.IGNORECASE | re.DOTALL
)

def replacer(match):
    create_stmt = match.group(1)
    policy_name = match.group(2)
    on_keyword = match.group(3)
    table_name = match.group(4)
    
    drop_stmt = f'DROP POLICY IF EXISTS {policy_name} ON {table_name};\n'
    return drop_stmt + match.group(0)

new_content = pattern.sub(replacer, content)

with open('fix_all_schema.sql', 'w') as f:
    f.write(new_content)

print("Fixed the storage.objects regex bug!")
