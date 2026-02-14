import { handler } from '../netlify/functions/admin-security-controls';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
