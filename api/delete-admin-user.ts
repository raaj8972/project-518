import { handler } from '../netlify/functions/delete-admin-user';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
