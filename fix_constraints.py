import re

with open('fix_all_schema.sql', 'r') as f:
    content = f.read()

# For any line explicitly matching this pattern:
# ALTER TABLE <table> ADD CONSTRAINT <name> UNIQUE <etc>;
# Replace with DROP CONSTRAINT IF EXISTS <name>; then ADD CONSTRAINT...
def replacer(match):
    table = match.group(1)
    constraint = match.group(2)
    rest = match.group(3)
    drop_stmt = f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {constraint};\n"
    return drop_stmt + match.group(0)

new_content = re.sub(r'ALTER\s+TABLE\s+([a-zA-Z0-9_]+)\s+ADD\s+CONSTRAINT\s+([a-zA-Z0-9_]+)\s+(UNIQUE.*?;)', replacer, content, flags=re.IGNORECASE)

with open('fix_all_schema.sql', 'w') as f:
    f.write(new_content)

print("Constraint idempotency fixed.")
