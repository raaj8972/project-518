import { secureEvent } from './lib/api-security';
import type { Handler } from '@netlify/functions';
const implementation: Handler = async () => ({ statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'ok' }) });
export const handler = secureEvent('health', implementation);
