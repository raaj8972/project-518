import { handler } from '../netlify/functions/image-proxy';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
