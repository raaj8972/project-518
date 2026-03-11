import re

with open('fix_all_schema.sql', 'r') as f:
    lines = f.readlines()

with open('fix_all_schema.sql', 'w') as f:
    for i, line in enumerate(lines):
        # We need to uncomment the lines or remove the unterminated CREATE POLICY
        if line.startswith('CREATE POLICY "Scanners can read own scans" ON pass_scans'):
            # Just add a semicolon to terminate it if the next lines are commented out
            lines[i] = 'CREATE POLICY "Scanners can read own scans" ON pass_scans FOR SELECT TO authenticated USING (true);\n'
        if line.startswith('--  FOR SELECT TO authenticated'):
            lines[i] = ''
        if line.startswith('--  USING (true); -- Simplified to allow reading history'):
            lines[i] = ''
        f.write(lines[i])

print("Fixed broken semicolon at line 9580")
