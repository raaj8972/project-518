import { handler } from '../netlify/functions/heartbeat_fallback.ts';
import { vercelAdapter } from './utils/adapter';
export const config = { runtime: 'nodejs' };
export default vercelAdapter(handler);
