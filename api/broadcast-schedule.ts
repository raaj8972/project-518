import { createClient } from '@supabase/supabase-js';
import { sendEmail } from './lib/email';

export default async (req: Request) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
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

    const { data: adminUser } = await supabaseAdmin.from('admin_users').select('role').eq('user_id', user.id).single();
    if (!adminUser) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers });

    const { provider = 'smtp' } = await req.json();

    // Fetch ALL distinct emails from approved registrations
    const { data: registrations } = await supabaseAdmin
        .from('registrations')
        .select('id, email, full_name')
        .eq('status', 'approved');

    if (!registrations || registrations.length === 0) {
        return new Response(JSON.stringify({ success: true, message: 'No participants' }), { status: 200, headers });
    }

    // Dedup by email
    const uniqueMap = new Map();
    registrations.forEach(r => {
        if (!uniqueMap.has(r.email)) uniqueMap.set(r.email, { name: r.full_name, id: r.id });
    });

    // Check who has already received this broadcast successfully
    const { data: emailLogs } = await supabaseAdmin
        .from('email_logs')
        .select('recipient_email')
        .eq('email_type', 'schedule_broadcast')
        .eq('status', 'sent')
        .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

    const alreadySent = new Set((emailLogs || []).map((log: any) => log.recipient_email.toLowerCase()));

    // Filter to only send to those who haven't received it yet
    const recipients = Array.from(uniqueMap.entries())
        .map(([email, data]) => ({ email, name: data.name, registrationId: data.id }))
        .filter(r => !alreadySent.has(r.email.toLowerCase()));

    if (recipients.length === 0) {
        return new Response(JSON.stringify({ 
            success: true, 
            message: 'All participants have already received this broadcast',
            total: uniqueMap.size,
            alreadySent: alreadySent.size,
            sent: 0
        }), { status: 200, headers });
    }

    console.log(`📧 Broadcasting to ${recipients.length} new recipients (${alreadySent.size} already sent)`);

    const batch = recipients.slice(0, 100);
    console.log(`Broadcasting schedule to ${batch.length} users via ${provider}`);

    // --- Fetch Stamp ---
    const { data: bucketFiles } = await supabaseAdmin.storage.from('pdf-watermarks').list();
    const findFileUrl = async (prefix: string) => {
        const file = bucketFiles?.find((f: any) => f.name === `${prefix}.png` || f.name === `${prefix}.svg`);
        if (file) {
            const { data } = await supabaseAdmin.storage.from('pdf-watermarks').createSignedUrl(file.name, 315360000);
            return data?.signedUrl;
        }
        return null;
    };
    const emailStampUrl = await findFileUrl('email_stamp');
    const defaultStampUrl = await findFileUrl('stamp');
    const stampUrl = emailStampUrl || defaultStampUrl;

    // Fetch actual schedule data
    const { data: scheduleDays } = await supabaseAdmin
        .from('schedule_days')
        .select('*, schedule_type')
        .order('date', { ascending: true });

    const { data: scheduleEvents } = await supabaseAdmin
        .from('schedule_events')
        .select('*')
        .order('time', { ascending: true });

    // Group events by day
    const scheduleData = (scheduleDays || []).map((day: any) => ({
        ...day,
        events: (scheduleEvents || []).filter((evt: any) => evt.schedule_day_id === day.id)
    }));

    // Check what schedules are available
    const prelimsSchedule = scheduleData.filter((day: any) => (day.schedule_type || 'prelims') === 'prelims');
    const mainsSchedule = scheduleData.filter((day: any) => day.schedule_type === 'mains');

    const hasPrelims = prelimsSchedule.length > 0;
    const hasMains = mainsSchedule.length > 0;

    // Determine email content based on what's available
    let emailSubject = '';
    let mainMessage = '';
    
    if (hasPrelims && !hasMains) {
        // Prelims released, mains pending
        emailSubject = '📅 RICO Prelims Schedule Released!';
        mainMessage = `
            <div style="margin-bottom: 32px;">
                <h2 style="color: #0d9488; font-size: 28px; margin: 0 0 16px 0;">🎉 Prelims Schedule is Now Live!</h2>
                <p style="font-size: 18px; color: #1f2937;">We're excited to announce that the <strong>Prelims Schedule</strong> for RICO 2026 has been released!</p>
            </div>

            <div style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); padding: 32px 24px; border-radius: 12px; text-align: center; margin: 32px 0;">
                <h3 style="margin: 0 0 16px 0; color: white; font-size: 24px;">📋 View Prelims Schedule</h3>
                <p style="margin: 0 0 24px 0; color: rgba(255,255,255,0.95); font-size: 16px;">Check out all the events, timings, and venues for the prelims</p>
                <a href="https://ricorrenza.fun/schedule" style="display: inline-block; background: white; color: #0d9488; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    View Schedule →
                </a>
            </div>

            <div style="margin: 32px 0; padding: 20px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px;">
                <p style="margin: 0 0 8px 0; color: #92400e; font-weight: 600; font-size: 16px;">🏆 Mains Schedule - Coming Soon!</p>
                <p style="margin: 0; color: #78350f;">The Mains schedule will be announced shortly. Stay tuned!</p>
            </div>
        `;
    } else if (hasPrelims && hasMains) {
        // Both schedules available (mains just uploaded)
        emailSubject = '🏆 RICO Mains Schedule Released!';
        mainMessage = `
            <div style="margin-bottom: 32px;">
                <h2 style="color: #8b5cf6; font-size: 28px; margin: 0 0 16px 0;">🎉 Mains Schedule is Now Live!</h2>
                <p style="font-size: 18px; color: #1f2937;">Great news! The <strong>Mains Schedule</strong> for RICO 2026 has been released!</p>
            </div>

            <div style="background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%); padding: 32px 24px; border-radius: 12px; text-align: center; margin: 32px 0;">
                <h3 style="margin: 0 0 16px 0; color: white; font-size: 24px;">🏆 View Mains Schedule</h3>
                <p style="margin: 0 0 24px 0; color: rgba(255,255,255,0.95); font-size: 16px;">Check out all the mains events with timings and venue details</p>
                <a href="https://ricorrenza.fun/schedule" style="display: inline-block; background: white; color: #8b5cf6; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    View Schedule →
                </a>
            </div>
        `;
    } else {
        // Fallback (no schedule yet)
        emailSubject = '📅 RICO Festival Schedule Update';
        mainMessage = `
            <div style="margin-bottom: 32px;">
                <h2 style="color: #6b7280; font-size: 28px; margin: 0 0 16px 0;">📅 Schedule Coming Soon!</h2>
                <p style="font-size: 18px; color: #1f2937;">The festival schedule will be announced shortly. Please check our website for updates.</p>
            </div>
        `;
    }

    const emailHtmlRaw = `
      <div class="email-container" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333333 !important; padding: 20px; background-color: #ffffff !important; max-width: 800px; margin: 0 auto;">
        <style>
            :root { color-scheme: light; supported-color-schemes: light; }
            @media only screen and (max-width: 600px) {
                .stamp-wrapper { margin-top: -100px !important; }
                h2 { font-size: 24px !important; }
                .cta-button { padding: 14px 24px !important; font-size: 16px !important; }
            }
            .email-container { background-color: #ffffff !important; color: #333333 !important; }
        </style>
        
        <div style="position: relative; z-index: 1;">
            <!-- HEADER -->
            <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 32px 24px; border-radius: 12px; text-align: center; margin-bottom: 32px;">
                <h1 style="margin: 0; color: white; font-size: 32px; font-weight: bold;">RICO 2026</h1>
                <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.8); font-size: 16px;">Festival Schedule Update</p>
            </div>

            <p><strong>Dear Participant,</strong></p>

            ${mainMessage}

            <p style="margin-top: 32px; color: #6b7280;">Mark your calendars and get ready for an amazing fest!</p>
            
            <!-- FOOTER -->
            <div style="margin-top: 40px; padding-top: 24px; border-top: 2px solid #e5e7eb;">
                <p style="margin: 0;">Best regards,<br/><strong>The RICO Tech-Team</strong></p>
                ${stampUrl ? `
                <div class="stamp-wrapper" style="text-align: right; margin-top: -80px; opacity: 0.6;">
                    <div style="
                        display: inline-block;
                        width: 250px;
                        max-width: 50%;
                        height: 0;
                        padding-bottom: 28%;
                        background-image: url('${stampUrl}');
                        background-size: contain;
                        background-repeat: no-repeat;
                        background-position: center;
                    ">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/c/ca/1x1.png" alt="Stamp" style="position: absolute; opacity: 0;" />
                    </div>
                </div>` : ''}
            </div>
        </div>
      </div>
    `;

    let successCount = 0;
    const errors = [];

    for (const rcpt of batch) {
        try {
            const res = await sendEmail({
                to: rcpt.email,
                subject: emailSubject,
                html: emailHtmlRaw.replace('Dear Participant,', `Dear <strong>${rcpt.name}</strong>,`),
                provider: provider as 'smtp' | 'resend'
            });
            if (res.success) {
                successCount++;
                // Log successful send
                await supabaseAdmin.from('email_logs').insert({
                    registration_id: rcpt.registrationId,
                    email_type: 'schedule_broadcast',
                    sent_at: new Date().toISOString(),
                    subject: emailSubject,
                    recipient_email: rcpt.email,
                    status: 'sent'
                });
            }
            else errors.push({ email: rcpt.email, error: res.error });
        } catch (e: any) {
             errors.push({ email: rcpt.email, error: e.message });
        }
    }

    return new Response(JSON.stringify({ 
        success: true, 
        total_unique: recipients.length,
        sent: successCount,
        failed: errors.length,
        limit_note: 'Batch 100 applied'
    }), { status: 200, headers });

  } catch (err: any) {
      console.error(err);
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
};
