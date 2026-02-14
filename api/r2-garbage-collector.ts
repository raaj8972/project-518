import { handler } from '../netlify/functions/r2-garbage-collector';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
