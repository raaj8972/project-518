import re

with open('fix_all_schema.sql', 'r') as f:
    content = f.read()

# Fix trailing commas before closing parenthesis
# e.g., "created_at timestamptz not null default now(),\n);" -> "created_at timestamptz not null default now()\n);"
content = re.sub(r',\s*\n\s*\)', '\n)', content)

# Fix any remaining double-dollar issues if they exist
content = re.sub(r'EXECUTE\s+\$\$(.*?)\$\$', r'EXECUTE $policy$\1$policy$', content, flags=re.DOTALL)

with open('fix_all_schema.sql', 'w') as f:
    f.write(content)

print(f"Fixed trailing commas and executing")
