import { handler } from '../netlify/functions/sync-drive-folders';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
