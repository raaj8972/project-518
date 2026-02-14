#!/bin/bash

# Script to copy netlify functions into api directory
# This eliminates the wrapper dependency

cd "$(dirname "$0")/.."

API_DIR="api"
NETLIFY_DIR="netlify/functions"

echo "Converting API wrappers to native Vercel functions..."
echo ""

count=0

# Process each API file
for api_file in "$API_DIR"/*.ts; do
  filename=$(basename "$api_file")
  
  # Skip utils directory and health.ts (already converted)
  if [ "$filename" = "health.ts" ]; then
    echo "✓ $filename (already converted)"
    continue
  fi
  
  # Extract function name using sed (macOS compatible)
  netlify_func=$(sed -n "s/.*from.*netlify\/functions\/\([^'\"]*\).*/\1/p" "$api_file" | head -1)
  
  if [ -z "$netlify_func" ]; then
    echo "⚠ $filename - no netlify import found"
    continue
  fi
  
  netlify_path="$NETLIFY_DIR/$netlify_func.ts"
  
  if [ ! -f "$netlify_path" ]; then
    echo "⚠ $filename - netlify function not found: $netlify_path"
    continue
  fi
  
  echo "📝 $filename ← $netlify_func.ts"
  
  # Copy the netlify function content directly
  cp "$netlify_path" "$api_file"
  ((count++))
  
done

echo ""
echo "✅ Converted $count files!"
echo "Ready to commit and deploy to Vercel"
