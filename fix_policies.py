import re

with open('fix_all_schema.sql', 'r') as f:
    content = f.read()

# Remove IF NOT EXISTS from CREATE POLICY
content = re.sub(r'(?i)create\s+policy\s+if\s+not\s+exists', 'CREATE POLICY', content)

with open('fix_all_schema.sql', 'w') as f:
    f.write(content)
