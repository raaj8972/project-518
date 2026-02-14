import { handler } from '../netlify/functions/master-login';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
