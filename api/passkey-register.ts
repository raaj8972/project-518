import { handler } from '../netlify/functions/passkey-register';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
