import { createClient } from '@supabase/supabase-js';
import { sendEmail } from './lib/email';
import { secureRequest } from './lib/api-security';
import { scheduleRecipients, renderScheduleBroadcast, type ScheduleRecipient } from '../../shared/scheduleBroadcast';
import { BRAND_YEAR } from '../../src/constants/brand';

// Read all recipients, including projects with more than PostgREST's 1,000-row cap.
async function readAll<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await query(from, from + 499);
    if (error) throw new Error('The email audience could not be loaded. No batch was started.');
    rows.push(...(data || []));
    if (!data || data.length < 500) return rows;
  }
}
const implementation = async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return Response.json({ error: 'Please sign in to manage schedule email.' }, { status: 401 });
  const scheduled = !!process.env.CRON_SECRET && req.method === 'GET' && authHeader === `Bearer ${process.env.CRON_SECRET}`;
  if (!scheduled && req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  try {
    const { getSupabaseClient } = await import('./lib/supabase');
    const admin = getSupabaseClient(true);
    if (!scheduled) {
      const { verifyAdmin } = await import('./lib/auth-verify');
      const { isAdmin, isOwner } = await verifyAdmin(authHeader, admin);
      if (!isAdmin) return Response.json({ error: 'Administrator access required.' }, { status: 403 });
      if (!isOwner) {
        const caller = createClient(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!, { auth: { persistSession: false }, global: { headers: { Authorization: authHeader } } });
        const scope = await caller.rpc('admin_can_manage_pages', { p_pages: ['schedule'], p_flags: ['can_schedule'] });
        if (scope.error || scope.data !== true) return Response.json({ error: 'Schedule management permission required.' }, { status: 403 });
      }
    }
    let body: { dryRun?: boolean; provider?: string } = {};
    if (!scheduled) { try { body = await req.json(); } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }); } }
    if (!body || typeof body !== 'object' || (body.dryRun !== undefined && typeof body.dryRun !== 'boolean') || (body.provider && !['smtp', 'resend'].includes(body.provider))) return Response.json({ error: 'Invalid email options.' }, { status: 400 });
    const [registrations, logs, days, settings] = await Promise.all([
      readAll<ScheduleRecipient>((from, to) => admin.from('registrations').select('id,email,full_name').eq('status', 'approved').order('id').range(from, to)),
      readAll<{ recipient_email: string }>((from, to) => admin.from('email_logs').select('recipient_email,id').eq('email_type', 'schedule_broadcast').eq('status', 'sent').gte('sent_at', new Date(Date.now() - 86400000).toISOString()).order('id').range(from, to)),
      admin.from('schedule_days').select('id,schedule_type,title,schedule_events(id)').order('date'),
      admin.from('homepage_settings').select('brand_year').limit(1).maybeSingle(),
    ]);
    if (days.error || settings.error) throw new Error('The current programme could not be loaded. No batch was started.');
    const audience = scheduleRecipients(registrations, logs);
    const counts = { total: audience.total, pending: audience.pending.length, sent: 0, failed: 0, remaining: audience.pending.length };
    if (body.dryRun) return Response.json({ success: true, ...counts });
    const populated = (days.data || []).filter(day => day.schedule_events?.length);
    if (!populated.length) return Response.json({ error: 'Add events to the programme before sending an update.' }, { status: 400 });
    const editions = [...new Set(populated.map(day => day.schedule_type === 'mains' ? 'Mains' : 'Prelims'))];
    const batch = audience.pending.slice(0, 100);
    let sent = 0, failed = 0, loggingFailed = false;
    for (let offset = 0; offset < batch.length; offset += 5) {
      await Promise.all(batch.slice(offset, offset + 5).map(async recipient => {
        try {
          const email = renderScheduleBroadcast({ name: recipient.full_name, year: Number(settings.data?.brand_year) || Number(BRAND_YEAR), editions, siteUrl: process.env.SITE_URL || 'https://ricorrenza.fun' });
          const result = await sendEmail({ to: recipient.email, ...email, provider: (body.provider || 'smtp') as 'smtp' | 'resend' });
          if (!result.success) { failed++; return; }
          sent++;
          const log = await admin.from('email_logs').insert({ registration_id: recipient.id, recipient_email: recipient.email, subject: email.subject, email_type: 'schedule_broadcast', status: 'sent', sent_at: new Date().toISOString() });
          if (log.error) loggingFailed = true;
        } catch { failed++; }
      }));
      if (loggingFailed) break;
    }
    if (loggingFailed) return Response.json({ error: `${sent} emails were sent, but delivery records could not be saved. The batch was stopped. Check email logs before retrying to avoid duplicate emails.`, sent, failed }, { status: 500 });
    return Response.json({ success: true, total: audience.total, pending: audience.pending.length - sent, sent, failed, remaining: audience.pending.length - sent });
  } catch (error) {
    console.error('[Schedule broadcast]', error instanceof Error ? error.message : 'Request failed');
    return Response.json({ error: error instanceof Error ? error.message : 'The schedule email could not be sent.' }, { status: 500 });
  }
};
export default secureRequest('broadcast-schedule', implementation);
