import { beforeEach, expect, it, vi } from 'vitest';
import { participantMailHandler } from '../netlify/functions/lib/participant-email';
import { renderParticipantEmail } from '../shared/participantEmail';
const mocks = vi.hoisted(() => ({ from: vi.fn(), send: vi.fn(), log: vi.fn(), registration: {} as any, brandingError: null as any }));
vi.mock('../netlify/functions/lib/email', () => ({ sendEmail: mocks.send }));
vi.mock('../netlify/functions/lib/supabase', () => ({ getSupabaseClient: () => ({ from: mocks.from, storage: { getBucket: async () => ({ data: { public: true } }), from: () => ({ list: async () => ({ data: [{ name: 'email_stamp.png' }, { name: 'stamp.png' }], error: mocks.brandingError }), getPublicUrl: (name: string) => ({ data: { publicUrl: `https://assets.example/${name}` } }) }) } }) }));
beforeEach(() => {
 vi.clearAllMocks(); mocks.brandingError = null; mocks.registration = { id: 'R1', event_id: 'E1', event_title: 'Acoustic evening', full_name: 'Mitali Sen', email: 'participant@example.test', status: 'approved', is_active: true, team_members: [{ name: 'Bandmate' }] };
 mocks.send.mockResolvedValue({ success: true }); mocks.log.mockResolvedValue({ error: null });
 mocks.from.mockImplementation((table: string) => {
  const result = { data: table === 'registrations' ? mocks.registration : table === 'events' ? { title: 'Canonical event', date: '2026-12-02', time: '18:00', venue: 'Main stage', rules: ['Arrive early'] } : table === 'homepage_settings' ? { brand_logo_url: 'https://assets.example/logo.png', brand_year: 2026 } : [{ name: 'Event coordinator' }], error: null };
  const query: any = { select: () => query, eq: () => query, limit: () => query, maybeSingle: async () => result, then: (resolve: any) => Promise.resolve(result).then(resolve), insert: mocks.log };
  return query;
 });
});
const send = (kind: 'confirmation' | 'rejection' | 'custom', body: object) => participantMailHandler(kind)(new Request('https://local.test/email', { method: 'POST', body: JSON.stringify({ registrationId: 'R1', provider: 'smtp', ...body }) }));
it('binds recipients, names and event details to Supabase and prefers the email-specific stamp', async () => {
 const response = await send('confirmation', { email: 'attacker@example.test', fullName: 'Spoofed person', eventTitle: 'Spoofed event', eventVenue: 'Spoofed venue' }); expect(response.status).toBe(200);
 const payload = mocks.send.mock.calls[0][0]; expect(payload.to).toBe('participant@example.test'); expect(payload.html).toContain('Canonical event'); expect(payload.html).toContain('Main stage'); expect(payload.html).toContain('email_stamp.png'); expect(payload.html).not.toContain('Spoofed'); expect(payload.html).not.toContain('margin-top: -');
 expect(mocks.log).toHaveBeenCalledWith(expect.objectContaining({ email_type: 'confirmation', template_type: 'confirmation', provider: 'smtp', registration_id: 'R1', status: 'sent' }));
});
it('rejects mismatched review status, deleted entries, invalid providers and malformed PDF attachments before delivery', async () => {
 expect((await send('confirmation', { provider: 'invalid' })).status).toBe(400); expect((await send('confirmation', { pdfAttachment: Buffer.from('<html>not a pdf</html>').toString('base64') })).status).toBe(400);
 mocks.registration.status = 'pending'; expect((await send('confirmation', {})).status).toBe(409);
 mocks.registration.deleted_at = '2026-11-26'; expect((await send('custom', { templateType: 'custom', customSubject: 'Update', customMessage: 'Hello' })).status).toBe(409); expect(mocks.send).not.toHaveBeenCalled();
});
it('escapes HTML in custom, rejection and achievement content and validates malformed subjects', async () => {
 expect((await send('custom', { templateType: 'custom', customSubject: 4, customMessage: 'Hello' })).status).toBe(400);
 expect((await send('custom', { templateType: 'custom', customSubject: 'Update\r\nBcc: victim', customMessage: 'Hello' })).status).toBe(400);
 const response = await send('custom', { templateType: 'custom', customSubject: 'Schedule', customMessage: '<script>unsafe()</script>' }); expect(response.status).toBe(200); expect(mocks.send.mock.calls[0][0].html).toContain('&lt;script&gt;');
 for (const kind of ['winner', 'rejection', 'selection'] as const) { const rendered = renderParticipantEmail({ kind, registration: mocks.registration, reason: '<img src=x>', position: '<img src=x>', stage: '<img src=x>' }); expect(rendered.html).toContain('&lt;img src=x&gt;'); expect(rendered.html).not.toContain('<img src=x>'); }
});
it('reports provider failures and keeps successful delivery distinct from a history-write failure', async () => {
 mocks.send.mockResolvedValueOnce({ success: false, error: 'SMTP authentication failed.' }); const failed = await send('confirmation', {}); expect(failed.status).toBe(422); expect(await failed.json()).toMatchObject({ success: false, error: 'SMTP authentication failed.' });
 mocks.log.mockResolvedValueOnce({ error: { code: 'SCHEMA_ERROR' } }); const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {}); try { const response = await send('confirmation', {}); expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ success: true, logSaved: false }); } finally { consoleError.mockRestore(); }
});
it('sends nothing if branding cannot be loaded and never retries an accepted email automatically', async () => {
 mocks.brandingError = { message: 'Storage unavailable' }; expect((await send('confirmation', {})).status).toBe(503); expect(mocks.send).not.toHaveBeenCalled();
});
