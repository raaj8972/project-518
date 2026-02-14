import { handler } from '../netlify/functions/passkey-list';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
