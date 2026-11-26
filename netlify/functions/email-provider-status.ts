import { secureRequest } from './lib/api-security';
import { checkEmailReadiness } from './lib/email-readiness';

export default secureRequest('email-provider-status', async () => Response.json(await checkEmailReadiness()));
