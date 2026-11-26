import nodemailer from 'nodemailer';

export type EmailProvider = 'smtp' | 'resend';
export type EmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  provider?: EmailProvider;
  from?: string;
  attachments?: { filename: string; content: string }[];
};
type EmailResult = { success: boolean; error?: string; messageId?: string; id?: string; provider?: EmailProvider; details?: { code?: string; status?: number } };
const mailbox = (value: string) => value.match(/<([^<>]+)>\s*$/)?.[1] || value;
const validAddress = (value: string) => !/[\r\n]/.test(value) && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(mailbox(value));

export function emailProviderConfiguration(provider: EmailProvider) {
  if (provider === 'resend') {
    const sender = (process.env.RESEND_FROM_EMAIL || process.env.EMAIL_SENDER || '').trim();
    if (!process.env.RESEND_API_KEY?.trim()) return { ready: false, sender, error: 'Resend API key is not configured.' };
    if (!validAddress(sender) || /@(gmail|yahoo|hotmail|outlook)\.com$/i.test(mailbox(sender))) return { ready: false, sender, error: 'Set RESEND_FROM_EMAIL to an address on your verified sending domain.' };
    return { ready: true, sender };
  }
  const sender = (process.env.EMAIL_SENDER || process.env.SMTP_USER || '').trim();
  if (!process.env.SMTP_USER?.trim() || !process.env.SMTP_PASS?.trim()) return { ready: false, sender, error: 'SMTP credentials are not configured.' };
  if (!validAddress(sender)) return { ready: false, sender, error: 'SMTP sender address is invalid.' };
  return { ready: true, sender };
}

export function smtpTransportOptions() {
  const port = Number(process.env.SMTP_PORT || 465);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('SMTP_PORT is invalid.');
  const secure = process.env.SMTP_SECURE === undefined ? port === 465 : process.env.SMTP_SECURE === 'true';
  return {
    host: process.env.SMTP_HOST?.trim() || 'smtp.hostinger.com', port, secure,
    ...(!secure ? { requireTLS: true } : {}),
    connectionTimeout: 12000, greetingTimeout: 12000, socketTimeout: 25000,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  };
}

export const sendEmail = async ({ to, subject, html, provider = 'smtp', from, attachments }: EmailOptions): Promise<EmailResult> => {
  if (!['smtp', 'resend'].includes(provider)) return { success: false, error: 'Invalid email provider.' };
  const recipients = Array.isArray(to) ? to : [to];
  if (!recipients.length || recipients.length > 100 || recipients.some(value => typeof value !== 'string' || !validAddress(value))) return { success: false, error: 'A valid recipient is required.' };
  if (!subject?.trim() || /[\r\n]/.test(subject)) return { success: false, error: 'A valid email subject is required.' };
  const config = emailProviderConfiguration(provider);
  if (!config.ready) return { success: false, error: config.error };
  const sender = from || config.sender;
  if (!validAddress(sender)) return { success: false, error: 'Email sender address is invalid.' };
  try {
    if (provider === 'smtp') {
      const transport = nodemailer.createTransport(smtpTransportOptions());
      try {
        const info = await transport.sendMail({ from: sender, to: recipients, subject, html, attachments: attachments?.map(file => ({ filename: file.filename, content: Buffer.from(file.content, 'base64') })) });
        if (info.rejected?.length || !info.accepted?.length) return { success: false, provider, error: 'The mail server rejected the recipient.' };
        return { success: true, messageId: info.messageId, provider };
      } finally { transport.close(); }
    }
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({ from: sender, to: recipients, subject, html, ...(attachments?.length ? { attachments } : {}) }),
      signal: AbortSignal.timeout(20000),
    });
    const result = await response.json();
    if (!response.ok || !result.id) {
      console.error('[email] Resend delivery failed', { status: response.status, code: result.name });
      return { success: false, provider, error: response.status === 403 ? 'Resend rejected the sending domain or API key. Check domain verification and sender settings.' : 'Resend could not accept the message. Check provider configuration and try again.', details: { status: response.status } };
    }
    return { success: true, id: result.id, provider };
  } catch (failure) {
    const code = (failure as { code?: string }).code || (failure instanceof Error ? failure.name : 'DELIVERY_ERROR');
    console.error('[email] Delivery failed', { provider, code });
    return { success: false, provider, error: code === 'EAUTH' ? 'SMTP authentication failed. Check the username and password or app password.' : 'Email delivery failed. Check provider connectivity and configuration.', details: { code } };
  }
};
