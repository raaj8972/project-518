import { handler } from '../netlify/functions/send-confirmation';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
