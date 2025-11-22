#!/usr/bin/env bash
set -euo pipefail

# transfer-db.sh
# Simple wrapper to dump a Supabase Postgres database from SRC_DB_URL and restore into DST_DB_URL
# Usage (run locally):
#
# export SRC_DB_URL='postgres://postgres:SRC_PASS@db.source.supabase.co:5432/postgres'
# export DST_DB_URL='postgres://postgres:DST_PASS@db.target.supabase.co:5432/postgres'
# ./scripts/transfer-db.sh
#
# NOTES:
# - Requires pg_dump and pg_restore (Postgres client tools) installed locally.
# - Do NOT commit or paste your credentials in public places. Provide them only via environment variables.
# - This script performs a full dump and restore (schema + data + functions + policies). Make sure the
#   target can accept the restore and that you have backups if it contains important data.

DUMP_FILE=${DUMP_FILE:-supabase_dump.pg}

if [ -z "${SRC_DB_URL-}" ] || [ -z "${DST_DB_URL-}" ]; then
  echo "Error: please set SRC_DB_URL and DST_DB_URL environment variables before running."
  echo "Example:"
  echo "  export SRC_DB_URL='postgres://postgres:SRC_PASS@db.source.supabase.co:5432/postgres'"
  echo "  export DST_DB_URL='postgres://postgres:DST_PASS@db.target.supabase.co:5432/postgres'"
  exit 1
fi

echo "Starting full DB transfer"
echo "  Dump file: $DUMP_FILE"

echo "Dumping source database (this may take a while)..."
pg_dump --format=custom --no-owner --no-acl --dbname="$SRC_DB_URL" -f "$DUMP_FILE"

echo "Restoring dump into target database (this will overwrite objects with --clean/--if-exists)..."
pg_restore --clean --if-exists --no-owner --no-acl -d "$DST_DB_URL" "$DUMP_FILE"

echo "Restore finished."
echo "Important post-restore checks:"
echo " - Verify required extensions (pgcrypto, citext, etc) are installed in the target DB if pg_restore complained."
echo " - Check RLS policies and functions via Supabase SQL editor."
echo " - If you copied auth.users, validate logins and consider rotating keys/secrets."

echo "Done. Consider removing the dump file if it contains sensitive data: rm -f $DUMP_FILE"
