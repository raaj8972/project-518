import re

with open('fix_all_schema.sql', 'r') as f:
    content = f.read()

# Pattern captures:
# 1. CREATE POLICY
# 2. "policy name"
# 3. ON
# 4. table_name
# Note: we need to handle optional IF NOT EXISTS that we removed, some whitespace, optional newlines before ON, optional schema in table_name
pattern = re.compile(
    r'(CREATE\s+POLICY\s+)("[^"]+"|[\w]+)(\s+ON\s+)(public\.)?([\w]+)',
    re.IGNORECASE | re.DOTALL
)

def replacer(match):
    create_stmt = match.group(1)
    policy_name = match.group(2)
    on_keyword = match.group(3)
    schema = match.group(4) or ''
    table_name = match.group(5)
    
    # We reconstruct the drop statement
    drop_stmt = f'DROP POLICY IF EXISTS {policy_name} ON {schema}{table_name};\n'
    
    return drop_stmt + match.group(0)

new_content = pattern.sub(replacer, content)

with open('fix_all_schema.sql', 'w') as f:
    f.write(new_content)

print("Policy fixes applied!")
