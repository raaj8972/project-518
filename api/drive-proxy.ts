import { handler } from '../netlify/functions/drive-proxy';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
