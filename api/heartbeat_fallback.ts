import { handler } from '../netlify/functions/heartbeat_fallback';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
