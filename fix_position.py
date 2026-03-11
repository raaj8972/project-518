with open('fix_all_schema.sql', 'r') as f:
    content = f.read()

# Fix position integer in RETURNS TABLE
content = content.replace('position integer,', '"position" integer,')
content = content.replace('position int,', '"position" integer,')

with open('fix_all_schema.sql', 'w') as f:
    f.write(content)
