import nodemailer from 'nodemailer';
import { createHash } from 'node:crypto';
import { emailProviderConfiguration, smtpTransportOptions } from './email';

export interface EmailReadiness { ready: boolean; status: string; message: string; }
let cache: { key: string; expires: number; value: { smtp: EmailReadiness; resend: EmailReadiness } } | null = null;

/** Verify authentication and sender configuration without sending a message. */
export async function checkEmailReadiness() {
  const key = createHash('sha256').update(['SMTP_HOST','SMTP_PORT','SMTP_SECURE','SMTP_USER','SMTP_PASS','EMAIL_SENDER','RESEND_API_KEY','RESEND_FROM_EMAIL'].map(name => process.env[name] || '').join('\0')).digest('hex');
  if (cache?.key === key && cache.expires > Date.now()) return cache.value;
  const smtp = async (): Promise<EmailReadiness> => {
    const config = emailProviderConfiguration('smtp');
    if (!config.ready) return { ready: false, status: 'configuration_required', message: config.error! };
    let transport: ReturnType<typeof nodemailer.createTransport> | undefined;
    try { transport = nodemailer.createTransport(smtpTransportOptions()); await transport.verify(); return { ready: true, status: 'verified', message: 'SMTP connection and authentication verified. No email was sent.' }; }
    catch (error) { return { ready: false, status: (error as { code?: string }).code === 'EAUTH' ? 'authentication_failed' : 'connection_failed', message: (error as { code?: string }).code === 'EAUTH' ? 'SMTP login was rejected. Update the username and password or app password.' : 'The configured SMTP server could not be verified.' }; }
    finally { transport?.close(); }
  };
  const resend = async (): Promise<EmailReadiness> => {
    const config = emailProviderConfiguration('resend');
    if (!config.ready) return { ready: false, status: 'configuration_required', message: config.error! };
    const domain = config.sender.match(/@([^>\s]+)/)?.[1]?.toLowerCase();
    try {
      const response = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }, signal: AbortSignal.timeout(12000) });
      const result = await response.json();
      if (!response.ok) return { ready: false, status: 'verification_unavailable', message: 'The API key could not list sending domains. Check its permissions and domain status in Resend.' };
      const sendingDomain = result.data?.find((entry: { name: string }) => entry.name?.toLowerCase() === domain);
      return sendingDomain?.status === 'verified' ? { ready: true, status: 'verified', message: 'Resend API access and sending domain verified. No email was sent.' } : { ready: false, status: 'domain_unverified', message: `Verify the DNS records for ${domain || 'the sender domain'} in Resend before sending.` };
    } catch { return { ready: false, status: 'connection_failed', message: 'Resend could not be reached. Please retry.' }; }
  };
  const [smtpStatus, resendStatus] = await Promise.all([smtp(), resend()]);
  const value = { smtp: smtpStatus, resend: resendStatus };
  cache = { key, expires: Date.now() + 60000, value };
  return value;
}
