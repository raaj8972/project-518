import { handler } from '../netlify/functions/passkey-register.ts';
import { vercelAdapter } from './utils/adapter';
export const config = { runtime: 'nodejs' };
export default vercelAdapter(handler);
