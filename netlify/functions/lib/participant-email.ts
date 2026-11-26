import { getSupabaseClient } from './supabase';
import { sendEmail } from './email';
import { renderParticipantEmail, type ParticipantEmailKind } from '../../../shared/participantEmail';

export async function participantMailBranding(client: ReturnType<typeof getSupabaseClient>) {
  const [{ data: files, error }, { data: settings, error: settingsError }] = await Promise.all([
    client.storage.from('pdf-watermarks').list('', { limit: 100 }),
    client.from('homepage_settings').select('brand_logo_url,brand_year').limit(1).maybeSingle(),
  ]);
  if (error || settingsError) throw new Error('Email branding could not load.');
  const name = ['email_stamp.png', 'email_stamp.svg', 'stamp.png', 'stamp.svg'].find(candidate => files?.some(file => file.name === candidate));
  let stampUrl: string | null = null;
  if (name) {
    const config = await client.storage.getBucket('pdf-watermarks');
    if (config.error) throw new Error('Email branding access could not be checked.');
    if (config.data?.public) stampUrl = client.storage.from('pdf-watermarks').getPublicUrl(name).data.publicUrl;
    else { const signed = await client.storage.from('pdf-watermarks').createSignedUrl(name, 604800); if (signed.error) throw signed.error; stampUrl = signed.data?.signedUrl || null; }
  }
  let logoUrl = '';
  try { logoUrl = new URL(settings?.brand_logo_url || '/favicon-96x96.png', process.env.SITE_URL || 'https://ricorrenza.fun').href; } catch { /* A text masthead is still available. */ }
  return { logoUrl, stampUrl, year: settings?.brand_year };
}

/** Authentication and assigned-page authorization run in secureRequest before this handler. */
export function participantMailHandler(kind: 'confirmation' | 'rejection' | 'custom') {
  return async (request: Request): Promise<Response> => {
    let body: Record<string, any>;
    try { body = await request.json(); } catch { return Response.json({ error: 'A valid JSON request is required.' }, { status: 400 }); }
    if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.registrationId !== 'string' || !body.registrationId.trim() || body.registrationId.length > 150 || !['smtp', 'resend'].includes(body.provider || 'smtp')) return Response.json({ error: 'A valid registration and email provider are required.' }, { status: 400 });
    const provider = body.provider || 'smtp';
    let template: ParticipantEmailKind = kind;
    if (kind === 'custom') {
      if (!['custom', 'winner', 'selection'].includes(body.templateType)) return Response.json({ error: 'Select a supported email template.' }, { status: 400 });
      template = body.templateType;
      if ((body.customSubject !== undefined && typeof body.customSubject !== 'string') || typeof (body.customMessage ?? '') !== 'string' || (body.customMessage || '').length > 20000 || (body.customSubject && (body.customSubject.length > 200 || /[\r\n]/.test(body.customSubject))) || (template === 'custom' && (!body.customSubject?.trim() || !body.customMessage?.trim()))) return Response.json({ error: 'Enter a valid subject and message.' }, { status: 400 });
      if (body.additionalData && (typeof body.additionalData !== 'object' || Array.isArray(body.additionalData) || ['position', 'stage'].some(field => body.additionalData[field] !== undefined && (typeof body.additionalData[field] !== 'string' || body.additionalData[field].length > 200)))) return Response.json({ error: 'The achievement or selection stage is invalid.' }, { status: 400 });
    }
    if (kind === 'rejection' && (typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 3000)) return Response.json({ error: 'Enter a rejection reason.' }, { status: 400 });
    let attachment: { filename: string; content: string }[] | undefined;
    if (kind === 'confirmation' && body.pdfAttachment != null) {
      if (typeof body.pdfAttachment !== 'string' || body.pdfAttachment.length > 4 * 1024 * 1024 || !/^[A-Za-z0-9+/]*={0,2}$/.test(body.pdfAttachment) || !Buffer.from(body.pdfAttachment, 'base64').subarray(0, 5).equals(Buffer.from('%PDF-'))) return Response.json({ error: 'The receipt must be a PDF of 3 MB or less.' }, { status: 400 });
      attachment = [{ filename: `Registration-${body.registrationId.replace(/[^\w-]/g, '_')}.pdf`, content: body.pdfAttachment }];
    }
    try {
      const client = getSupabaseClient(true);
      const { data: registration, error } = await client.from('registrations').select('id,event_id,event_title,full_name,email,status,is_active,deleted_at,team_members').eq('id', body.registrationId).maybeSingle();
      if (error) throw error;
      if (!registration) return Response.json({ error: 'Registration not found.' }, { status: 404 });
      if (registration.deleted_at || (kind === 'confirmation' && (registration.status !== 'approved' || registration.is_active !== true)) || (kind === 'rejection' && registration.status !== 'rejected')) return Response.json({ error: 'This email does not match the registration’s current review status.' }, { status: 409 });
      const eventResult = registration.event_id ? await client.from('events').select('title,date,time,venue,rules').eq('id', registration.event_id).maybeSingle() : { data: null, error: null };
      if (eventResult.error) throw eventResult.error;
      const coordinatorResult = registration.event_id ? await client.from('event_coordinators').select('name,phone').eq('event_id', registration.event_id) : { data: [], error: null };
      if (coordinatorResult.error) throw coordinatorResult.error;
      const branding = await participantMailBranding(client);
      const message = renderParticipantEmail({ kind: template, registration: { ...registration, event_title: eventResult.data?.title || registration.event_title }, event: eventResult.data, coordinators: coordinatorResult.data || [], ...branding, hasReceipt: !!attachment, reason: body.reason, message: body.customMessage, subject: body.customSubject, position: body.additionalData?.position, stage: body.additionalData?.stage });
      // Recipient, event details and participant identity always come from Supabase.
      const result = await sendEmail({ to: registration.email, ...message, provider, attachments: attachment });
      const log = await client.from('email_logs').insert({ recipient_email: registration.email, registration_id: registration.id, event_id: registration.event_id || null, template_type: template, email_type: template, subject: message.subject, status: result.success ? 'sent' : 'failed', provider, details: { eventTitle: registration.event_title, error: result.error || null } });
      if (log.error) console.error('[participant-email] Delivery log could not be saved', { code: log.error.code });
      if (!result.success) return Response.json({ success: false, error: result.error || 'Email delivery failed.', logSaved: !log.error }, { status: 422 });
      return Response.json({ success: true, logSaved: !log.error, ...(log.error ? { warning: 'The email was accepted, but delivery history could not be saved. Do not resend automatically.' } : {}) });
    } catch { return Response.json({ error: 'Participant details or branding could not load. No email was sent.' }, { status: 503 }); }
  };
}
