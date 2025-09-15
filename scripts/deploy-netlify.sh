#!/usr/bin/env bash
set -euo pipefail

# Simple one-shot Netlify deploy script.
# Requires: netlify-cli installed and site already linked (`netlify init`).

if ! command -v netlify >/dev/null 2>&1; then
  echo "Netlify CLI not found. Install with: npm i -g netlify-cli" >&2
  exit 1
fi

if [ -z "${VITE_SUPABASE_URL:-}" ] || [ -z "${VITE_SUPABASE_ANON_KEY:-}" ]; then
  echo "Warning: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set in shell."
  echo "These should be set in Netlify env via 'netlify env:set' if not provided here."
fi

npm run build
netlify deploy --build --prod
