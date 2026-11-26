import type { Handler } from '@netlify/functions';
/** Retire old/cached clients without loading models or processing gallery photos. */
export const handler: Handler = async () => ({
  statusCode: 410,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify({ error: 'Face indexing has been removed.' }),
});
