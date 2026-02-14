import { handler } from '../netlify/functions/health';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
