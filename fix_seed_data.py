import re

with open('fix_all_schema.sql', 'r') as f:
    content = f.read()

# Comment out INSERT INTO sponsors, schedule_days, schedule_events
content = re.sub(r'(INSERT INTO sponsors.*?ON CONFLICT DO NOTHING;)', r'/* \1 */', content, flags=re.DOTALL | re.IGNORECASE)
content = re.sub(r'(INSERT INTO schedule_days.*?ON CONFLICT DO NOTHING;)', r'/* \1 */', content, flags=re.DOTALL | re.IGNORECASE)
content = re.sub(r'(INSERT INTO schedule_events.*?ON CONFLICT DO NOTHING;)', r'/* \1 */', content, flags=re.DOTALL | re.IGNORECASE)

with open('fix_all_schema.sql', 'w') as f:
    f.write(content)

print("Seed data commented out.")
