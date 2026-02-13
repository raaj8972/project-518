import { handler } from '../netlify/functions/delete-r2-file.ts';
import { vercelAdapter } from './utils/adapter';
export const config = { runtime: 'nodejs' };
export default vercelAdapter(handler);
