import { handler } from '../netlify/functions/r2-garbage-collector.ts';
import { vercelAdapter } from './utils/adapter';
export const config = { runtime: 'nodejs' };
export default vercelAdapter(handler);
