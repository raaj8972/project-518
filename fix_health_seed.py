import re

with open('fix_all_schema.sql', 'r') as f:
    content = f.read()

# Comment out INSERT INTO health_heartbeats
content = re.sub(r'(?si)(insert\s+into\s+(public\.)?health_heartbeats.*?on\s+conflict[^\n]*;)', r'/* \1 */', content)

with open('fix_all_schema.sql', 'w') as f:
    f.write(content)

print("Commented out health_heartbeats seed data.")
