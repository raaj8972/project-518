import { handler } from '../netlify/functions/update-form-settings.ts';
import { vercelAdapter } from './utils/adapter';
export const config = { runtime: 'nodejs' };
export default vercelAdapter(handler);
