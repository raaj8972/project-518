import { invokeHandler } from '../netlify/functions/lib/invoke-handler';
import type { Plugin, ViteDevServer, PreviewServer } from 'vite';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Run the same handlers locally as Netlify; never forward missing APIs to SPA HTML.
export function localApi(): Plugin {
  const configure = (server: ViteDevServer | PreviewServer) => {
      const cache = new Map<string, any>();
      if ('watcher' in server) server.watcher.on('change', file => { if (file.includes('/netlify/functions/')) cache.clear(); });
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || '/', 'http://localhost');
        const match = url.pathname.match(/^\/(?:api|\.netlify\/functions)\/([a-zA-Z0-9_-]+)$/);
        if (!match) return next();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        try {
          const name = match[1];
          const entry = ['ts', 'mts', 'js'].map(ext => resolve(server.config.root, `netlify/functions/${name}.${ext}`)).find(existsSync);
          if (!entry) { res.statusCode = 404; res.end(JSON.stringify({ error: 'API endpoint not found' })); return; }
          let handler = cache.get(name);
          if (!handler) {
            const dir = resolve(server.config.root, 'node_modules/.local-api');
            await mkdir(dir, { recursive: true });
            const output = resolve(dir, `${name}.cjs`);
            const result = await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false, target: 'node22' });
            await writeFile(output, result.outputFiles[0].contents);
            const require = createRequire(import.meta.url);
            delete require.cache[output];
            handler = require(output);
            cache.set(name, handler);
          }
          const chunks: Buffer[] = [];
          let size = 0;
          for await (const chunk of req) {
            size += chunk.length;
            if (size > 6 * 1024 * 1024) { res.statusCode = 413; res.end(JSON.stringify({ error: 'Request too large' })); return; }
            chunks.push(Buffer.from(chunk));
          }
          const response = await invokeHandler(handler, {
            httpMethod: req.method, headers: req.headers, path: url.pathname,
            rawUrl: url.href, rawQuery: url.search.slice(1), queryStringParameters: Object.fromEntries(url.searchParams),
            multiValueQueryStringParameters: {}, body: Buffer.concat(chunks).toString('utf8'), isBase64Encoded: false,
          }, {});
          res.statusCode = response.statusCode;
          for (const [key, value] of Object.entries(response.headers || {})) res.setHeader(key, String(value));
          res.end(response.isBase64Encoded ? Buffer.from(response.body || '', 'base64') : response.body || '');
        } catch (error) {
          console.error('[Local API]', match[1], error instanceof Error ? error.message : 'Handler failed');
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'API unavailable. Check the server configuration and logs.' }));
        }
      });
  };
  return { name: 'local-netlify-api', apply: 'serve', configureServer: configure, configurePreviewServer: configure };
}
