import { handler } from '../netlify/functions/install-heartbeat';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
