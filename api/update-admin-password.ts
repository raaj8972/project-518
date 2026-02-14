import { handler } from '../netlify/functions/update-admin-password';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
