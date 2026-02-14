#!/bin/bash

# Convert Netlify Handler format to Vercel format
# Changes: export const handler: Handler => export default

cd "$(dirname "$0")/.."

echo "Converting Netlify Handler format to Vercel default export..."

count=0

for file in api/*.ts; do
  if grep -q "export const handler: Handler" "$file"; then
    filename=$(basename "$file")
    echo "📝 Converting $filename"
    
    # Replace "export const handler: Handler" with "export default"
    sed -i.bak 's/export const handler: Handler/export default/' "$file"
    
    # Remove .bak file
    rm -f "${file}.bak"
    
    ((count++))
  fi
done

echo ""
echo "✅ Converted $count files from Netlify Handler to Vercel default export"
