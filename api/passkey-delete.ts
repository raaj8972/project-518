import { handler } from '../netlify/functions/passkey-delete';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
