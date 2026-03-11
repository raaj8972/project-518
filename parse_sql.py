import pg_query
import sys

with open('feb28_schema.sql', 'r') as f:
    sql = f.read()

try:
    pg_query.parse(sql)
    print("SUCCESS: The SQL is 100% syntactically valid PostgreSQL!")
except Exception as e:
    print(f"ERROR FOUND: {e}")
