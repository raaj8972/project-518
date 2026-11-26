import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { checkEmailReadiness } from '../netlify/functions/lib/email-readiness';
import { sendEmail, smtpTransportOptions } from '../netlify/functions/lib/email';
const mocks = vi.hoisted(() => ({ create: vi.fn(), send: vi.fn(), close: vi.fn(), verify: vi.fn() }));
vi.mock('nodemailer', () => ({ default: { createTransport: mocks.create } }));
beforeEach(() => { vi.clearAllMocks(); mocks.create.mockReturnValue({ sendMail: mocks.send, close: mocks.close, verify: mocks.verify }); mocks.verify.mockResolvedValue(true); mocks.send.mockResolvedValue({ accepted: ['participant@example.test'], rejected: [], messageId: 'receipt-id' }); vi.stubEnv('SMTP_USER', 'sender@example.test'); vi.stubEnv('SMTP_PASS', 'private-app-password'); vi.stubEnv('SMTP_HOST', 'smtp.example.test'); vi.stubEnv('SMTP_PORT', '587'); vi.stubEnv('SMTP_SECURE', 'false'); vi.stubEnv('EMAIL_SENDER', 'Festival <sender@example.test>'); vi.stubEnv('RESEND_API_KEY', 'server-only-fixture'); vi.stubEnv('RESEND_FROM_EMAIL', 'Festival <updates@ricorrenza.fun>'); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const message = { to: 'participant@example.test', subject: 'Event update', html: '<p>Message</p>' };
it('honors the configured SMTP host, port and STARTTLS and closes the connection after acceptance', async () => {
 expect(smtpTransportOptions()).toMatchObject({ host: 'smtp.example.test', port: 587, secure: false, requireTLS: true });
 expect(await sendEmail(message)).toMatchObject({ success: true, messageId: 'receipt-id' }); expect(mocks.close).toHaveBeenCalledOnce();
});
it('surfaces SMTP rejection without leaking credentials or treating partial delivery as success', async () => {
 mocks.send.mockRejectedValueOnce({ code: 'EAUTH', message: 'private-app-password' }); const spy = vi.spyOn(console, 'error').mockImplementation(() => {}); try { const result = await sendEmail(message); expect(result.success).toBe(false); expect(result.error).toContain('authentication failed'); expect(JSON.stringify(result)).not.toContain('private-app-password'); } finally { spy.mockRestore(); }
 mocks.send.mockResolvedValueOnce({ accepted: [], rejected: ['participant@example.test'] }); expect((await sendEmail(message)).success).toBe(false);
});
it('uses an explicit Resend sender and refuses the previous silent fallback to the test domain', async () => {
 const fetch = vi.fn().mockResolvedValue(Response.json({ id: 'resend-id' })); vi.stubGlobal('fetch', fetch); expect(await sendEmail({ ...message, provider: 'resend' })).toMatchObject({ success: true, id: 'resend-id' }); expect(JSON.parse(fetch.mock.calls[0][1].body).from).toBe('Festival <updates@ricorrenza.fun>');
 vi.stubEnv('RESEND_FROM_EMAIL', ''); vi.stubEnv('EMAIL_SENDER', 'sender@gmail.com'); const result = await sendEmail({ ...message, provider: 'resend' }); expect(result.success).toBe(false); expect(result.error).toContain('RESEND_FROM_EMAIL'); expect(fetch).toHaveBeenCalledOnce();
});
it('rejects missing credentials and mail header injection before opening a network connection', async () => {
 vi.stubEnv('SMTP_PASS', ''); expect((await sendEmail(message)).success).toBe(false); expect((await sendEmail({ ...message, subject: 'Subject\r\nBcc: victim@example.test' })).success).toBe(false); expect(mocks.create).not.toHaveBeenCalled();
});

it('checks SMTP authentication and Resend domain status without sending messages', async () => {
 vi.stubEnv('SMTP_HOST', 'readiness.example.test'); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ data: [{ name: 'ricorrenza.fun', status: 'failed' }] })));
 const result = await checkEmailReadiness(); expect(result.smtp).toMatchObject({ ready: true, status: 'verified' }); expect(result.resend).toMatchObject({ ready: false, status: 'domain_unverified' }); expect(mocks.verify).toHaveBeenCalledOnce(); expect(mocks.send).not.toHaveBeenCalled(); expect(JSON.stringify(result)).not.toContain('private-app-password');
});
