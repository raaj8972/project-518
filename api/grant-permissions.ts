import { handler } from '../netlify/functions/grant-permissions';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
