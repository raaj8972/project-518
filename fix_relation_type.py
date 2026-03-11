import re

with open('fix_all_schema.sql', 'r') as f:
    content = f.read()

# Replace registration_id uuid references public.registrations(id)
# with registration_id text references public.registrations(id)
content = re.sub(r'registration_id\s+uuid\s+references\s+public\.registrations\(id\)', 'registration_id text references public.registrations(id)', content, flags=re.IGNORECASE)

with open('fix_all_schema.sql', 'w') as f:
    f.write(content)

print("Type mismatch in email_logs fixed.")
