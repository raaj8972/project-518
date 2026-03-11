import re

with open('fix_all_schema.sql', 'r') as f:
    content = f.read()

# Replace any lingering `ON storage;` with `ON storage.objects;`
content = re.sub(r'ON\s+storage;', 'ON storage.objects;', content, flags=re.IGNORECASE)

with open('fix_all_schema.sql', 'w') as f:
    f.write(content)
