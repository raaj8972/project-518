import { handler } from '../netlify/functions/add-admin-user';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
