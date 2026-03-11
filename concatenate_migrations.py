import glob
import re
import os

out_lines = []
files = sorted(glob.glob('supabase/migrations/*.sql'))

for fpath in files:
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
        
        # Replace bash-style comments with SQL-style comments FIRST
        lines = content.split('\n')
        new_lines = []
        for line in lines:
            if re.match(r'^\s*#', line):
                line = re.sub(r'^(\s*)#', r'\1--', line)
            new_lines.append(line)
        
        content = '\n'.join(new_lines)

        # Replace ADD COLUMN with ADD COLUMN IF NOT EXISTS gracefully
        content = re.sub(r'(?i)\bADD\s+COLUMN\b(?!\s+IF\s+NOT\s+EXISTS)', 'ADD COLUMN IF NOT EXISTS', content)
        
        # Replace CREATE TABLE with CREATE TABLE IF NOT EXISTS gracefully
        content = re.sub(r'(?i)\bCREATE\s+TABLE\b(?!\s+IF\s+NOT\s+EXISTS)', 'CREATE TABLE IF NOT EXISTS', content)
        
        # Ensure it always ends in exactly one newline
        out_lines.append(content.strip() + '\n')

with open('fix_all_schema.sql', 'w', encoding='utf-8') as f:
    f.writelines(out_lines)

print(f"Concatenated {len(files)} files into fix_all_schema.sql")
