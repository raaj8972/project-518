import re

with open('feb28_schema.sql', 'r') as f:
    text = f.read()

# "create policy if not exists" -> "create policy"
text = re.sub(r'(?i)CREATE\s+POLICY\s+IF\s+NOT\s+EXISTS', 'CREATE POLICY', text)

with open('feb28_schema.sql', 'w') as f:
    f.write(text)

print("Fixed CREATE POLICY IF NOT EXISTS syntax errors.")
