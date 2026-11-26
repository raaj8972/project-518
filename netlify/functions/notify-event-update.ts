import { secureRequest } from './lib/api-security';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from './lib/email';
import { escapeEmailHtml, renderEventUpdateEmail } from '../../shared/eventUpdateEmail';

const implementation = async (req: Request) => {
  if (!['POST', 'OPTIONS'].includes(req.method)) return Response.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'POST, OPTIONS' } });
  const headers = {
    // 'Access-Control-Allow-Origin': '*' // Restricted by policy,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) return new Response(JSON.stringify({ error: 'Config Error' }),{status:500,headers});

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Missing Auth' }), { status: 401, headers });
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return new Response(JSON.stringify({ error: 'Invalid Token' }), { status: 401, headers });

    // Fetch Watermark and Stamp URLs dynamically to handle .png or .svg
    const { data: bucketFiles } = await supabaseAdmin.storage.from('pdf-watermarks').list();
    
    // Helper to find file
    const findFileUrl = async (prefix: string) => {
        const file = [`${prefix}.png`, `${prefix}.svg`].map(name => bucketFiles?.find((item: any) => item.name === name)).find(Boolean);
        if (file) {
            // Use signed URL to ensure access even if bucket is private (10 years expiry)
            const { data } = await supabaseAdmin.storage.from('pdf-watermarks').createSignedUrl(file.name, 315360000);
            return data?.signedUrl;
        }
        return null;
    };

    // Param refactoring: keep stampUrl finding logic
    // Prefer 'email_stamp' (specific) over 'stamp' (shared)
    const emailStampUrl = await findFileUrl('email_stamp');
    const defaultStampUrl = await findFileUrl('stamp');
    const stampUrl = emailStampUrl || defaultStampUrl;



    // Parse Body
    const { eventId, eventTitle, newDetails, provider = 'smtp', updateType = 'schedule', message, rules } = await req.json();

    if (!eventId || typeof eventTitle !== 'string' || !eventTitle.trim() || !['schedule', 'rules', 'combined'].includes(updateType) || !['smtp', 'resend'].includes(provider) || (rules !== undefined && !Array.isArray(rules))) return Response.json({ error: 'Invalid event update' }, { status: 400, headers });

    const { data: branding } = await supabaseAdmin.from('homepage_settings').select('brand_logo_url, brand_year').limit(1).maybeSingle();
    let logoUrl = '';
    try { logoUrl = new URL(branding?.brand_logo_url || '/favicon-96x96.png', process.env.SITE_URL || 'https://ricorrenza.fun').href; } catch { /* The email still includes its text masthead. */ }

    // Fetch Registrants
    const { data: registrations, error: registrationsError } = await supabaseAdmin
        .from('registrations')
        .select('email, full_name, id, team_members')
        .eq('event_id', eventId)
        .eq('status', 'approved');

    if (registrationsError) throw new Error('Approved registrations could not be loaded. No update was sent.');

    if (!registrations || registrations.length === 0) {
        return new Response(JSON.stringify({ success: true, message: 'No participants', total: 0, sent: 0, failed: 0 }), { status: 200, headers });
    }

    const { data: coordinators } = await supabaseAdmin
        .from('event_coordinators')
        .select('name, phone')
        .eq('event_id', eventId);
    
    // Send Emails (Parallel Batches of 5)


    const getEmailBody = (reg: any) => renderEventUpdateEmail({ eventId, eventTitle, updateType, message, rules, newDetails, registration: reg, coordinators: coordinators || [], logoUrl, stampUrl, year: branding?.brand_year });

    const batch = registrations.slice(0, 100); // 100 limit still safe 
    console.log(`Sending update to ${batch.length} users via ${provider}`);

    let successCount = 0;
    const errors: any[] = [];
    const logs: any[] = [];


    // Optimized: Send in chunks to prevent timeout, but limit concurrency for SMTP safety
    const CONCURRENCY = 5; 
    for (let i = 0; i < batch.length; i += CONCURRENCY) {
        const chunk = batch.slice(i, i + CONCURRENCY);
        await Promise.all(chunk.map(async (reg) => {
            try {
                // Generate email body for this specific registrant (includes team members, id, watermarks)
                const { subject, html } = getEmailBody(reg);

                const res = await sendEmail({
                    to: reg.email,
                    subject: subject,
                    html,
                    provider: provider as 'smtp' | 'resend'
                });
                if (res.success) {
                    successCount++;
                    logs.push({
                        recipient_email: reg.email,
                        template_type: 'update',
                        status: 'sent',
                        provider: provider,
                        event_id: eventId,
                        registration_id: reg.id,
                        details: { eventTitle, newDetails, updateType }
                    });
                }
                else {
                    console.error('[notify-event-update] Failed to send to:', reg.email, 'Error:', res.error);
                    errors.push({ email: reg.email, error: res.error, details: res.details });
                    logs.push({
                        recipient_email: reg.email,
                        template_type: 'update',
                        status: 'failed',
                        provider: provider,
                        event_id: eventId,
                        registration_id: reg.id,
                        details: { eventTitle, newDetails, error: res.error, errorDetails: res.details, updateType }
                    });
                }
            } catch (e: any) {
                 errors.push({ email: reg.email, error: e.message });
                 logs.push({
                    recipient_email: reg.email,
                    template_type: 'update',
                    status: 'failed',
                    provider: provider,
                    event_id: eventId,
                    registration_id: reg.id,
                    details: { eventTitle, newDetails, error: e.message, updateType }
                });
            }
        }));
    }

    if (logs.length > 0) {
        await supabaseAdmin.from('email_logs').insert(logs);
    }

    // --- Admin Notification ---
    if (user.email) {
        try {
            await sendEmail({
                to: user.email,
                subject: `Broadcast Summary: ${eventTitle}`,
                html: `
                    <h3>Update Broadcast Complete</h3>
                    <p>You successfully sent an event update for <strong>${escapeEmailHtml(eventTitle)}</strong>.</p>
                    <p><strong>Type:</strong> ${updateType}</p>
                    <ul>
                        <li><strong>Total Approved Registrants:</strong> ${registrations.length}</li>
                        <li><strong>Emails Attempted (Batch):</strong> ${batch.length}</li>
                        <li><strong>Successfully Sent:</strong> ${successCount}</li>
                        <li><strong>Failed:</strong> ${errors.length}</li>
                    </ul>
                `,
                provider: provider as 'smtp' | 'resend'
            });
            console.log('Admin notification sent to:', user.email);
        } catch (adminErr) {
            console.error('Failed to notify admin:', adminErr);
        }
    }

    return new Response(JSON.stringify({ 
        success: true, 
        total: registrations.length,
        sent: successCount,
        failed: errors.length,
        limit_note: 'Batch 100 applied'
    }), { status: 200, headers });

  } catch (err: any) {
      console.error(err);
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
};

export default secureRequest('notify-event-update', implementation);
