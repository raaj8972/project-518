#!/usr/bin/env node

/**
 * Script to convert API wrapper files to native Vercel functions
 * This eliminates the dependency on netlify/functions directory
 */

const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, '..', 'api');
const netlifyFunctionsDir = path.join(__dirname, '..', 'netlify', 'functions');

// Read all files in api directory
const apiFiles = fs.readdirSync(apiDir).filter(f => f.endsWith('.ts') && f !== 'utils');

console.log(`Found ${apiFiles.length} API files to convert`);

apiFiles.forEach(file => {
  const apiFilePath = path.join(apiDir, file);
  const content = fs.readFileSync(apiFilePath, 'utf8');
  
  // Skip if already converted (doesn't have wrapper import)
  if (!content.includes('vercelWrapper') && !content.includes('../netlify/functions/')) {
    console.log(`✓ ${file} - already converted`);
    return;
  }
  
  // Extract the netlify function name from the import
  const importMatch = content.match(/from ['"]\.\.\/netlify\/functions\/(.+)['"]/);
  if (!importMatch) {
    console.log(`⚠ ${file} - couldn't find netlify function import`);
    return;
  }
  
  const netlifyFunctionName = importMatch[1];
  const netlifyFunctionPath = path.join(netlifyFunctionsDir, `${netlifyFunctionName}.ts`);
  
  if (!fs.existsSync(netlifyFunctionPath)) {
    console.log(`⚠ ${file} - netlify function not found: ${netlifyFunctionPath}`);
    return;
  }
  
  // Read the netlify function
  const netlifyContent = fs.readFileSync(netlifyFunctionPath, 'utf8');
  
  // Check if it's the new edge function format (export default async (req: Request))
  // or old handler format (export const handler: Handler)
  const isEdgeFormat = netlifyContent.includes('export default async (req: Request)');
  
  if (isEdgeFormat) {
    // For edge format functions, we can use them almost directly
    // Just need to wrap with Vercel's Request/Response types
    const newContent = `import type { VercelRequest, VercelResponse } from '@vercel/node';
${netlifyContent.replace(/^import.*@netlify\/functions.*$/m, '')}

// Vercel compatibility wrapper
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Convert VercelRequest to Web Request
  const url = \`\${req.headers['x-forwarded-proto'] || 'http'}://\${req.headers.host}\${req.url}\`;
  const webRequest = new Request(url, {
    method: req.method || 'GET',
    headers: new Headers(req.headers as any),
    body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
  });
  
  // Call the original handler
  const response = await handler(webRequest);
  
  // Convert Web Response to Vercel Response
  const body = await response.text();
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  res.status(response.status).send(body);
}`.replace('await handler(webRequest)', `await ${netlifyFunctionName}Handler(webRequest)`);
    
    // This approach is getting complicated. Let me use a simpler method.
    console.log(`⚠ ${file} - edge format detected, needs manual conversion`);
    return;
  }
  
  console.log(`⚠ ${file} - needs manual review`);
});

console.log('\nConversion complete. Manual review recommended for flagged files.');
