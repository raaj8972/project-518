import { handler } from '../netlify/functions/update-form-settings';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
