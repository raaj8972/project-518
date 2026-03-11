import re

with open('fix_all_schema.sql', 'r') as f:
    lines = f.readlines()

with open('fix_all_schema.sql', 'w') as f:
    for line in lines:
        # Replace lines that start with # (allowing leading whitespace)
        # Note: we should be careful not to replace '#' inside strings, but for SQL comments it's usually the whole line
        if re.match(r'^\s*#', line):
            line = re.sub(r'^(\s*)#', r'\1--', line)
        f.write(line)
