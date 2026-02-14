import { handler } from '../netlify/functions/client-ip';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
