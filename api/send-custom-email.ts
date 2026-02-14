import { handler } from '../netlify/functions/send-custom-email';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
