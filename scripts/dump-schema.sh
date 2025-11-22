#!/usr/bin/env bash
set -euo pipefail

# dump-schema.sh
# Dumps extension creation statements and the full schema (tables, views, functions, RLS policies, indexes)
# from a source Postgres database into a single plain SQL file suitable for restoring into another
# Postgres (Supabase) project. Run locally — do NOT paste secrets.
#
# Usage:
# export SRC_DB_URL='postgres://postgres:PASS@db.source.supabase.co:5432/postgres'
# ./scripts/dump-schema.sh
# This will produce schema.sql and create_extensions.sql (and echo the path on completion).

SRC_DB_URL=${SRC_DB_URL:-}
OUT_FILE=${OUT_FILE:-schema.sql}
EXT_FILE=${EXT_FILE:-create_extensions.sql}

if [ -z "$SRC_DB_URL" ]; then
  echo "Error: please set SRC_DB_URL environment variable before running."
  echo "Example: export SRC_DB_URL='postgres://postgres:PASS@db.source.supabase.co:5432/postgres'"
  exit 1
fi

echo "Generating extension creation statements from source..."
# produce CREATE EXTENSION IF NOT EXISTS statements (one per installed extension)
psql "$SRC_DB_URL" -Atc "SELECT 'CREATE EXTENSION IF NOT EXISTS \"' || extname || '\";' FROM pg_extension;" > "$EXT_FILE"

echo "Creating combined schema file: $OUT_FILE"
echo "-- Auto-generated schema dump (extensions + schema-only)" > "$OUT_FILE"
echo "-- Generated on: $(date -u +'%Y-%m-%dT%H:%M:%SZ')" >> "$OUT_FILE"
echo >> "$OUT_FILE"
echo "-- Extensions (create these before applying the schema)" >> "$OUT_FILE"
cat "$EXT_FILE" >> "$OUT_FILE"
echo >> "$OUT_FILE"
echo "-- Schema (tables, views, functions, policies, indexes)" >> "$OUT_FILE"

# Dump schema-only in plain SQL and append
pg_dump --schema-only --no-owner --no-acl --dbname="$SRC_DB_URL" >> "$OUT_FILE"

echo "Done. Files generated:" 
ls -lh "$EXT_FILE" "$OUT_FILE"
echo "Inspect $OUT_FILE for accuracy before applying to the target. To apply on the target run:"
echo "  export DST_DB_URL='postgres://postgres:PASS@your-target.supabase.co:5432/postgres'"
echo "  psql \"$DST_DB_URL\" -f $OUT_FILE"

echo "Security: Do NOT paste connection strings or keys in public places. Rotate any keys used after migration."
