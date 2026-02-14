import { handler } from '../netlify/functions/create-admin';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
