import { handler } from '../netlify/functions/passkey-challenge';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
