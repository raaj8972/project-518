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

    // Parse Body
    const { eventId, eventTitle, newDetails, provider = 'smtp' } = await req.json();

    // Fetch Registrants
    const { data: registrations } = await supabaseAdmin
        .from('registrations')
        .select('email, full_name, id, team_members')
        .eq('event_id', eventId)
        .eq('status', 'approved');

    if (!registrations || registrations.length === 0) {
        return new Response(JSON.stringify({ success: true, message: 'No participants' }), { status: 200, headers });
    }

    const { data: coordinators } = await supabaseAdmin
        .from('event_coordinators')
        .select('name, phone')
        .eq('event_id', eventId);
    
    let coordinatorsHtml = '';
    if (coordinators && coordinators.length > 0) {
        const coordString = coordinators.map((c: any) => `${c.name}${c.phone ? ` (${c.phone})` : ''}`).join(', ');
        coordinatorsHtml = `
            <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
                <p style="margin: 0 0 10px 0; color: #666;"><strong>Need Help? Contact Coordinators:</strong></p>
                <p style="margin: 0; font-size: 14px; color: #444;">${coordString}</p>
            </div>
        `;
    }

    const { date, time, venue } = newDetails;
    const emailSubject = `Update: ${eventTitle} Details Changed`;
    const emailHtmlRaw = `
      <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
        <h2 style="color: #ea580c;">Event Update Alert</h2>
        <p>Dear Participant,</p>
        <p><strong>Registration ID: {{REG_ID}}</strong></p>
        {{TEAM_MEMBERS}}
        <p>There has been an update to the details for <strong>${eventTitle}</strong>.</p>
        <div style="background: #fff7ed; border: 1px solid #fed7aa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>New Event Details:</strong></p>
            <ul style="list-style: none; padding: 0; margin: 0;">
                <li style="margin-bottom: 5px;">📅 <strong>Date:</strong> ${date || 'TBA'}</li>
                <li style="margin-bottom: 5px;">⏰ <strong>Time:</strong> ${time || 'TBA'}</li>
                <li>📍 <strong>Venue:</strong> ${venue || 'TBA'}</li>
            </ul>
        </div>
        <p>Please make a note of these changes.</p>
        ${coordinatorsHtml}
        <p>Best regards,<br/>The RICO Tech-Team</p>
      </div>
    `;

    // Send Loops (Node.js handles concurrency better than Deno Edge usually)
    // We can use Promise.all but we should be careful with SMTP connection limits if using 'smtp'.
    // Resend handles concurrent HTTP requests fine.
    // Hostinger SMTP likely has a connection limit (e.g. 10 simultaneous).
    // Let's use a small concurrency limit manually or just rely on Nodemailer pooling (it has built-in pooling).
    // We will just fire them off.

    const batch = registrations.slice(0, 100); // 100 limit still safe 
    console.log(`Sending update to ${batch.length} users via ${provider}`);

    let successCount = 0;
    const errors = [];
    const logs = [];


    // Simple sequential or small-batch approach if SMTP
    for (const reg of batch) {
        try {
            const res = await sendEmail({
                to: reg.email,
                subject: emailSubject,
                html: emailHtmlRaw
                    .replace('Dear Participant,', `Dear <strong>${reg.full_name}</strong>,`)
                    .replace('{{REG_ID}}', reg.id)
                    .replace('{{TEAM_MEMBERS}}', (() => {
                        const tm = reg.team_members;
                        let list = [];
                        if (Array.isArray(tm)) list = tm;
                        else if (typeof tm === 'string') { try { list = JSON.parse(tm); } catch {} }
                        
                        if (list.length > 0) {
                            const names = list.map((m: any) => m.name || m).join(', ');
                            return `
                                <div style="margin: 15px 0; padding: 10px; background-color: #f8fafc; border-radius: 4px;">
                                    <p style="margin: 0 0 5px 0; font-size: 12px; color: #64748b; text-transform: uppercase;">Team Members</p>
                                    <p style="margin: 0; color: #334155;">${names}</p>
                                </div>
                            `;
                        }
                        return '';
                    })()),
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
                    details: { eventTitle, newDetails }
                });
            }
            else errors.push({ email: reg.email, error: res.error });
        } catch (e: any) {
             errors.push({ email: reg.email, error: e.message });
        }
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
                    <p>You successfully sent an event update for <strong>${eventTitle}</strong>.</p>
                    <ul>
                        <li><strong>Total Approved Registrants:</strong> ${registrations.length}</li>
                        <li><strong>Emails Attempted (Batch):</strong> ${batch.length}</li>
                        <li><strong>Successfully Sent:</strong> ${successCount}</li>
                        <li><strong>Failed:</strong> ${errors.length}</li>
                    </ul>
                    <p>The participants have been notified of the new details (Date: ${date}, Time: ${time}, Venue: ${venue}).</p>
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
