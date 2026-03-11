import os
import glob

# Directory containing all the individual Supabase migration scripts
migration_dir = 'supabase/migrations'
files = glob.glob(os.path.join(migration_dir, '*.sql'))

# Supabase migrations use a 14-digit timestamp: YYYYMMDDHHMMSS
# We want all files that were created strictly before 2026-03-01
valid_files = []
for f in files:
    basename = os.path.basename(f)
    try:
        timestamp = int(basename.split('_')[0])
        if timestamp < 20260301000000:
            valid_files.append(f)
    except ValueError:
        pass

# Ensure they are run in the exact order they were originally created
valid_files.sort()

content = ""
for f in valid_files:
    with open(f, 'r') as infile:
        content += f"-- ========= Source Migration: {os.path.basename(f)} =========\n"
        content += infile.read() + "\n\n"

# Output the perfectly clean, unmodified Feb 28th schema
with open('feb28_schema.sql', 'w') as out:
    out.write(content)

print(f"Successfully concatenated {len(valid_files)} migration files into feb28_schema.sql")
