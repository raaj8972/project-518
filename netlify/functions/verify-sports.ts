import type { Handler } from '@netlify/functions';

/** Shared sports passcodes no longer grant a session. Each admin uses their own account. */
export const handler: Handler = async () => ({
  statusCode: 410,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify({ error: 'Use your individual admin account. The owner assigns sports pages from Admin accounts.', loginUrl: '/login' }),
});
