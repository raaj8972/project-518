import { handler } from '../netlify/functions/force-logout';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
