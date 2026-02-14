import { handler } from '../netlify/functions/send-rejection';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
