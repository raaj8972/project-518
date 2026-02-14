import { handler } from '../netlify/functions/notify-event-update';
import { vercelWrapper } from './utils/wrapper';

export default vercelWrapper(handler as any);
