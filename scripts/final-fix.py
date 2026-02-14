import os
import re
import glob

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # 1. Fix event.body parsing
    # const { ... } = JSON.parse(event.body || '{}')
    content = re.sub(
        r'const\s+(\{[^}]+\})\s+=\s+JSON\.parse\(event\.body\s*\|\|\s*\'\{\}\'\)',
        r'const body = await req.json();\n    const \1 = body',
        content
    )
    # const body = JSON.parse(event.body || '{}')
    content = re.sub(
        r'const\s+body\s+=\s+JSON\.parse\(event\.body\s*\|\|\s*\'\{\}\'\)',
        r'const body = await req.json()',
        content
    )

    # 2. Fix return { statusCode: ... }
    # Simple object return
    # return { statusCode: 200, body: JSON.stringify({...}) }
    
    # We use a loop to handle nested braces in JSON.stringify is hard with regex
    # So we'll try a few common patterns
    
    # Pattern A: return { statusCode: N, body: JSON.stringify(...) }
    content = re.sub(
        r'return\s*\{\s*statusCode:\s*(\d+),\s*body:\s*JSON\.stringify\((.*)\)\s*\}',
        r'return new Response(JSON.stringify(\2), { status: \1, headers })',
        content
    )
    
    # Pattern B: return { statusCode: N, body: 'string' }
    content = re.sub(
        r"return\s*\{\s*statusCode:\s*(\d+),\s*body:\s*'([^']*)'\s*\}",
        r"return new Response('\2', { status: \1, headers })",
        content
    )
     # Pattern C: return { statusCode: N, body: variable }
    content = re.sub(
        r"return\s*\{\s*statusCode:\s*(\d+),\s*body:\s*([a-zA-Z0-9_.]+)\s*\}",
        r"return new Response(\2, { status: \1, headers })",
        content
    )
    
    # 3. Fix event.headers
    content = re.sub(r"event\.headers\[['\"]([^'\"]+)['\"]\]", r"req.headers.get('\1')", content)
    content = re.sub(r"event\.headers", r"req.headers", content)
    
    # 4. Remove Handler imports if still present
    content = re.sub(r"import.*@netlify/functions.*\n", "", content)
    
    # 5. Fix function signature if missed (e.g. export default async (event) =>)
    if 'export default async (event)' in content:
         content = content.replace('export default async (event)', 'export default async (req: Request)')
         # Add headers if missing
         if 'const headers =' not in content:
             headers_code = """
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }
"""
             content = content.replace('export default async (req: Request) => {', 'export default async (req: Request) => {' + headers_code)

    if content != original:
        print(f"Fixed {filepath}")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

def main():
    files = glob.glob('api/*.ts')
    for f in files:
        fix_file(f)

if __name__ == '__main__':
    main()
