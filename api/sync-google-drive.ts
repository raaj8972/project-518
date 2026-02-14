import { handler } from '../netlify/functions/sync-google-drive';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
