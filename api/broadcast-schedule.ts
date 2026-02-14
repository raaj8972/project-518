import { handler } from '../netlify/functions/broadcast-schedule';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
