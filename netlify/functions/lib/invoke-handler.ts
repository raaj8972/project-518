// Support both Netlify's event handlers and its Request/Response function format.
export async function invokeHandler(module: { handler?: Function; default?: Function; scheduledHandler?: Function }, event: any, context = {}) {
  if (typeof module.scheduledHandler === 'function') {
    const secret = process.env.CRON_SECRET;
    if (!secret || event.headers?.authorization !== `Bearer ${secret}`) return { statusCode: 401, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Scheduled invocation required' }) };
    return module.scheduledHandler(event, context);
  }
  if (typeof module.handler === 'function') return module.handler(event, context);
  if (typeof module.default !== 'function') throw new Error('API handler is not configured');
  const method = event.httpMethod || 'GET';
  const headers = Object.fromEntries(Object.entries(event.headers || {}).filter(([, value]) => value != null)) as Record<string, string>;
  const request = new Request(event.rawUrl || `http://localhost${event.path || '/'}`, {
    method, headers,
    ...(!['GET', 'HEAD'].includes(method) ? { body: event.isBase64Encoded ? Buffer.from(event.body || '', 'base64') : event.body || '' } : {}),
  });
  const response = await module.default(request, context) as { status: number; headers: Iterable<[string, string]>; arrayBuffer(): Promise<ArrayBuffer> };
  return { statusCode: response.status, headers: Object.fromEntries(response.headers),
    body: Buffer.from(await response.arrayBuffer()).toString('base64'), isBase64Encoded: true };
}
