import { handler } from '../netlify/functions/heartbeat-schedule';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
