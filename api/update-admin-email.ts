import { handler } from '../netlify/functions/update-admin-email';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
