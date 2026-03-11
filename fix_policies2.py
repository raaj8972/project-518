import re

with open('fix_all_schema.sql', 'r') as f:
    content = f.read()

# Replace the inner EXECUTE $$ ... $$ block inside DO $$ ... END $$;
# The issue here is that the DO block is already using $$, so the inner $$ trips up the parser.
# We'll just replace inner $$ with $policy$
content = re.sub(r'EXECUTE\s+\$\$(.*?)\$\$', r'EXECUTE $policy$\1$policy$', content, flags=re.DOTALL)

with open('fix_all_schema.sql', 'w') as f:
    f.write(content)
