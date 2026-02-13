import { handler } from '../netlify/functions/get-r2-upload-url.ts';
import { vercelAdapter } from './utils/adapter';
export const config = { runtime: 'nodejs' };
export default vercelAdapter(handler);
