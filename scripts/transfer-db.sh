#!/usr/bin/env bash
set -euo pipefail

# transfer-db.sh
# Safer wrapper to dump a Supabase Postgres database from SRC_DB_URL and restore into DST_DB_URL
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
# - This version avoids overwriting an existing non-empty dump by creating a timestamped filename.

DUMP_FILE=${DUMP_FILE:-supabase_dump.pg}

fail_trap() {
  rc=$?
  echo "ERROR: transfer failed with exit code ${rc} on line ${1:-unknown}."
  echo "If the dump file looks wrong, remove it and re-run the script."
  exit "$rc"
}
trap 'fail_trap $LINENO' ERR

if [ -z "${SRC_DB_URL-}" ] || [ -z "${DST_DB_URL-}" ]; then
  echo "Error: please set SRC_DB_URL and DST_DB_URL environment variables before running."
  echo "Example:"
  echo "  export SRC_DB_URL='postgres://postgres:SRC_PASS@db.source.supabase.co:5432/postgres'"
  echo "  export DST_DB_URL='postgres://postgres:DST_PASS@db.target.supabase.co:5432/postgres'"
  exit 1
fi

# If there's an existing non-empty dump file, don't overwrite it — write to a timestamped file.
if [ -f "$DUMP_FILE" ] && [ -s "$DUMP_FILE" ]; then
  TS=$(date +%Y%m%d%H%M%S)
  NEW_DUMP_FILE="${DUMP_FILE%.*}-$TS.${DUMP_FILE##*.}"
  echo "Notice: existing dump file '$DUMP_FILE' found and non-empty; writing to '$NEW_DUMP_FILE' instead."
  DUMP_FILE="$NEW_DUMP_FILE"
fi

echo "Starting full DB transfer"
echo "  Dump file: $DUMP_FILE"

echo "Checking available tools..."
command -v pg_dump >/dev/null 2>&1 || { echo "pg_dump not found in PATH"; exit 1; }
command -v pg_restore >/dev/null 2>&1 || { echo "pg_restore not found in PATH"; exit 1; }

echo "Dumping source database (this may take a while)..."
echo "Running: pg_dump --format=custom --no-owner --no-acl --dbname=SRC_DB_URL -f $DUMP_FILE"
pg_dump --format=custom --no-owner --no-acl --dbname="$SRC_DB_URL" -f "$DUMP_FILE"

# verify dump file looks valid
if [ ! -s "$DUMP_FILE" ]; then
  echo "Error: created dump file '$DUMP_FILE' is empty. Dump failed or wrote zero bytes."
  exit 1
fi

echo "Dump complete; contents (first 50 lines of pg_restore --list):"
pg_restore --list "$DUMP_FILE" | head -n 50 || true

echo "Restoring dump into target database (this will overwrite objects with --clean/--if-exists)..."
echo "Running: pg_restore --clean --if-exists --no-owner --no-acl -d DST_DB_URL $DUMP_FILE"
pg_restore --clean --if-exists --no-owner --no-acl -d "$DST_DB_URL" "$DUMP_FILE"

echo "Restore finished."
echo "Important post-restore checks:"
echo " - Verify required extensions (pgcrypto, citext, etc) are installed in the target DB if pg_restore complained."
echo " - Check RLS policies and functions via Supabase SQL editor."
echo " - If you copied auth.users, validate logins and consider rotating keys/secrets."

echo "Done. Consider removing the dump file if it contains sensitive data: rm -f $DUMP_FILE"
