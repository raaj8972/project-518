import { handler } from '../netlify/functions/get-r2-upload-url';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
