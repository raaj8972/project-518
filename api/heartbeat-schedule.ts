import { handler } from '../netlify/functions/heartbeat-schedule.ts';
import { vercelAdapter } from './utils/adapter';
export const config = { runtime: 'nodejs' };
export default vercelAdapter(handler);
