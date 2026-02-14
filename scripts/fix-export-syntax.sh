#!/bin/bash

# Fix invalid export syntax created by previous sed command
# Change: export default = async => export default async

cd "$(dirname "$0")/.."

echo "Fixing export syntax errors..."

count=0

for file in api/*.ts; do
  if grep -q "export default = async" "$file"; then
    filename=$(basename "$file")
    echo "🔧 Fixing $filename"
    
    # Fix the syntax error
    sed -i.bak 's/export default = async/export default async/' "$file"
    
    # Remove .bak file
    rm -f "${file}.bak"
    
    ((count++))
  fi
done

echo ""
echo "✅ Fixed $count files"
