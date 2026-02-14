#!/usr/bin/env python3
"""
Convert Netlify Handler API files to Web Request/Response format
Works on both Netlify and Vercel
"""

import re
import os
import glob

def convert_file(filepath):
    """Convert a single API file from Netlify Handler to Web API format"""
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content =f.read()
    
    # Skip if already converted (uses Web Request param)
    if '(req: Request)' in content or 'export default async (req: Request)' in content:
        print(f"✓ {os.path.basename(filepath)} - already converted")
        return False
    
    # Skip if doesn't use Netlify Handler format
    if 'HandlerEvent' not in content and '(event)' not in content:
        print(f"⚠ {os.path.basename(filepath)} - not a Netlify Handler file")
        return False
    
    print(f"📝 Converting {os.path.basename(filepath)}...")
    
    # 1. Remove Netlify imports
    content = re.sub(r"import.*@netlify/functions.*\n", "", content)
    content = re.sub(r"import type.*Handler.*from.*@netlify/functions.*\n", "", content)
    
    # 2. Replace function signature
    # Handle various formats: (event), (event, context), (event: HandlerEvent), etc.
    content = re.sub(
        r'export default async \((event[^)]*)\) =>', 
        'export default async (req: Request) =>', 
        content
    )
    
    # 3. Add CORS headers at the start of the function
    cors_headers = '''  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

'''
    
    # Insert CORS after function signature
    content = re.sub(
        r'(export default async \(req: Request\) => \{)\n',
        r'\1\n' + cors_headers,
        content
    )
    
    # 4. Replace event.httpMethod with req.method
    content = content.replace('event.httpMethod', 'req.method')
    
    # 5. Replace event.body parsing with req.json()
    # Handle: JSON.parse(event.body || '{}')
    content = re.sub(
        r'JSON\.parse\(event\.body \|\| \'{}\']\)',
        'await req.json()',
        content
    )
    content = re.sub(
        r'JSON\.parse\(event\.body\)',
        'await req.json()',
        content
    )
    
    # 6. Replace event.headers with req.headers.get()
    # This needs manual handling for different patterns
    content = re.sub(
        r"event\.headers\['([^']+)'\]",
        r"req.headers.get('\1')",
        content
    )
    content = re.sub(
        r'event\.headers\["([^"]+)"\]',
        r'req.headers.get("\1")',
        content
    )
    
    # 7. Replace response format { statusCode, body } with new Response()
    # This is complex - handle common patterns
    
    # Simple pattern: return { statusCode: XXX, body: 'string' }
    content = re.sub(
        r"return \{ statusCode: (\d+), body: '([^']*)' \}",
        r"return new Response('\2', { status: \1, headers })",
        content
    )
    
    # Pattern: return { statusCode: XXX, body: JSON.stringify(...) }
    content = re.sub(
        r'return \{ statusCode: (\d+), body: JSON\.stringify\(([^}]+)\) \}',
        r'return new Response(JSON.stringify(\2), { status: \1, headers })',
        content
    )
    
    # Multi-line return pattern (more complex)
    content = re.sub(
        r'return \{\s+statusCode: (\d+),\s+body: JSON\.stringify\(([^}]+\{[^}]+\})\)\s+\}',
        r'return new Response(JSON.stringify(\2), { status: \1, headers })',
        content,
        flags=re.DOTALL
    )
    
    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return True

def main():
    api_dir = os.path.join(os.path.dirname(__file__), '..', 'api')
    api_files = glob.glob(os.path.join(api_dir, '*.ts'))
    
    # Exclude files that are already converted or are utilities
    exclude = ['health.ts', 'send-custom-email.ts', 'master-login.ts', 'sync-google-drive.ts']
    api_files = [f for f in api_files if os.path.basename(f) not in exclude]
    
    converted_count = 0
    
    for filepath in api_files:
        if convert_file(filepath):
            converted_count += 1
    
    print(f"\n✅ Converted {converted_count} files!")
    print("\nNote: Some files may need manual review for complex response patterns")

if __name__ == '__main__':
    main()
