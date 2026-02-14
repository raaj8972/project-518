#!/bin/bash

# Fix remaining event references that the Python script missed
# This specifically targets event.headers and old response formats

cd "$(dirname "$0")/.."

echo "Fixing remaining Netlify patterns in API files..."

# Fix event.headers references
for file in api/*.ts; do
  # Skip if file doesn't exist or is already fully converted
  if [ ! -f "$file" ]; then
    continue
  fi
  
  # Replace event.headers with req.headers
  sed -i.bak 's/event\.headers/req.headers/g' "$file"
  
  # Fix old-style responses that were missed
  # Pattern: return { statusCode: XXX, body: JSON.stringify({ ... }) }
  # This is complex for sed, so we'll use perl
  perl -i.bak2 -pe 's/return \{ statusCode: (\d+), body: JSON\.stringify\(([^}]+\}) \}\}/return new Response(JSON.stringify($2), { status: $1, headers })/g' "$file"
  
  # Simpler pattern: return { statusCode: XXX, body: 'text' }
  perl -i.bak3 -pe "s/return \{ statusCode: (\d+), body: '([^']*)' \}/return new Response('$2', { status: \$1, headers })/g" "$file"
  
  # Cleanup backup files
  rm -f "${file}.bak" "${file}.bak2" "${file}.bak3"
done

echo "✅ Fixed event references and response formats"
