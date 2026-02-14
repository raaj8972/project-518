import { handler } from '../netlify/functions/purge-audit';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
