import { handler } from '../netlify/functions/heartbeat';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
