import { handler } from '../netlify/functions/list-admin-users';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
