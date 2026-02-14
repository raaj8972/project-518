import { handler } from '../netlify/functions/create-admin-device-session';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
