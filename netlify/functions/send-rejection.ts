import { secureRequest } from './lib/api-security';
import { participantMailHandler } from './lib/participant-email';

export default secureRequest('send-rejection', participantMailHandler('rejection'));
