#!/bin/bash
# Manual cleanup script for admin sessions and passkeys
# Run this if pg_cron is not available on your Supabase instance

# This script can be run:
# 1. Manually when needed
# 2. Via cron on your server: 0 2 * * * /path/to/cleanup.sh
# 3. Via GitHub Actions on a schedule

# Load environment variables
source .env 2>/dev/null || true

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL not set"
  echo "Set it in .env file or as environment variable"
  exit 1
fi

echo "Running authentication data cleanup..."
psql "$DATABASE_URL" -c "SELECT public.cleanup_auth_data();"

if [ $? -eq 0 ]; then
  echo "✅ Cleanup completed successfully"
else
  echo "❌ Cleanup failed"
  exit 1
fi
