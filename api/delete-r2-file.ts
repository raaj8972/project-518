import { handler } from '../netlify/functions/delete-r2-file';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
