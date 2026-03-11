import re

with open('fix_all_schema.sql', 'r') as f:
    content = f.read()

# The error says: trigger "homebound_settings_set_timestamp" for relation "homebound_settings" already exists
# We should add a `DROP TRIGGER IF EXISTS trigger_name ON table_name;` before any `CREATE TRIGGER trigger_name ON table_name`
# Or replace `CREATE TRIGGER` with `DROP TRIGGER IF EXISTS ... \n CREATE TRIGGER ...`

# Let's find patterns like:
# CREATE TRIGGER trg_name
# BEFORE UPDATE ON table_name

pattern = re.compile(
    r'(create\s+trigger\s+)([a-zA-Z0-9_]+)(\s+(?:before|after|instead\s+of)\s+(?:insert|update|delete|truncate)\s+(?:or\s+(?:insert|update|delete|truncate)\s+)*on\s+)([a-zA-Z0-9_.]+)',
    re.IGNORECASE | re.DOTALL
)

def replacer(match):
    trigger_name = match.group(2)
    table_name = match.group(4)
    drop_stmt = f'DROP TRIGGER IF EXISTS {trigger_name} ON {table_name};\n'
    return drop_stmt + match.group(0)

new_content = pattern.sub(replacer, content)

with open('fix_all_schema.sql', 'w') as f:
    f.write(new_content)

print("Applied DROP TRIGGER IF EXISTS to CREATE TRIGGER statements.")
