import os

# Define the base imports and adapter logic
dispatcher_template = """function isRequest(arg: any): arg is Request {
    return arg instanceof Request;
}

import { vercelAdapter, webAdapter } from './utils/adapter.js';

"""

# List files and generate imports
files = sorted([f for f in os.listdir('netlify/functions') if f.endswith('.ts') and f not in ['image-proxy.ts', 'drive-proxy.ts', 'lib']])
imports = []
mapping = []

for f in files:
    name = f.replace('.ts', '')
    safe_name = name.replace('-', '_').replace('.', '_')
    # Use explicit .js for imports to handle TS resolution quirks if any
    # But for module resolution=node, it prefers no extension or .js if ESM
    # Let's try importing from source directly if Vercel allows (usually yes)
    # But Vercel's build expects compiled output? No, it compiles source.
    # So '../netlify/functions/foo' is safest.
    imports.append(f"import * as {safe_name} from '../netlify/functions/{name}.js';")
    mapping.append(f"  '{name}': {safe_name},")

dispatcher_template += '\n'.join(imports) + '\n\n'
dispatcher_template += 'const handlers: Record<string, any> = {\n' + '\n'.join(mapping) + '\n};\n\n'

dispatcher_template += """export default async function (req: any, res: any) {
  const { fn } = req.query; // Query param from rewrite rule
  
  if (!fn) {
    res.status(400).send('Missing function name');
    return;
  }
  
  const funcName = Array.isArray(fn) ? fn[0] : fn;
  const mod = handlers[funcName];

  if (!mod) {
    res.status(404).send('Function not found: ' + funcName);
    return;
  }

  try {
      if (mod.handler) {
        return vercelAdapter(mod.handler)(req, res);
      } else if (mod.default) {
        // Assume default export is a Web API handler (Request -> Response)
        // If it takes Request, wrap it.
        // If it takes (req, res), run it directly?
        // But (req, res) is Vercel legacy. Modern Vercel functions use Web API.
        // Let's assume default export handles Request.
        return webAdapter(mod.default)(req, res);
      } else {
        res.status(500).send('Invalid function export');
      }
  } catch (e: any) {
      console.error(e);
      res.status(500).send(e.toString());
  }
}
"""

with open('api/dispatcher.ts', 'w') as f:
    f.write(dispatcher_template)

print("Generated api/dispatcher.ts with " + str(len(files)) + " functions.")
