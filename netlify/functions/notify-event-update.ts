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

    // Fetch Watermark and Stamp URLs dynamically to handle .png or .svg
    const { data: bucketFiles } = await supabaseAdmin.storage.from('pdf-watermarks').list();
    
    // Helper to find file
    const findFileUrl = async (prefix: string) => {
        const file = bucketFiles?.find((f: any) => f.name === `${prefix}.png` || f.name === `${prefix}.svg`);
        if (file) {
            // Use signed URL to ensure access even if bucket is private (10 years expiry)
            const { data } = await supabaseAdmin.storage.from('pdf-watermarks').createSignedUrl(file.name, 315360000);
            return data?.signedUrl;
        }
        return null;
    };

    const watermarkUrl = (await findFileUrl('watermark')) || 'https://ricorrenza.fun/logo.png'; // Fallback to logo if no watermark
    // Prefer 'email_stamp' (specific) over 'stamp' (shared)
    const emailStampUrl = await findFileUrl('email_stamp');
    const defaultStampUrl = await findFileUrl('stamp');
    const stampUrl = emailStampUrl || defaultStampUrl;

    const watermarkHtml = watermarkUrl ? `
        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; overflow: hidden; pointer-events: none;">
            <img src="${watermarkUrl}" alt="" style="width: 220%; max-width: none; opacity: 0.19; position: absolute; bottom: 0; left: -60%;" />
        </div>
    ` : '';



    // Parse Body
    const { eventId, eventTitle, newDetails, provider = 'smtp', updateType = 'schedule', message, rules } = await req.json();

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
    
    // Send Emails (Parallel Batches of 5)


    // Helper to generate email body
    const getEmailBody = (reg: any) => {
        let teamMembersHtml = '';
        if (reg.team_members && Array.isArray(reg.team_members) && reg.team_members.length > 0) {
            teamMembersHtml = `
                <div style="background-color: #fce7f3; padding: 10px; border-radius: 6px; margin: 10px 0; border: 1px solid #fbcfe8;">
                    <p style="margin: 0; font-weight: bold; color: #be185d; font-size: 13px;">Team Members:</p>
                    <ul style="margin: 5px 0 0 0; padding-left: 20px; color: #831843;">
                        ${reg.team_members.map((m: any) => `<li>${m.name || m}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        let coordinatorsHtml = '';
        if (coordinators && coordinators.length > 0) {
            coordinatorsHtml = `
                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
                    <p style="margin: 0; font-weight: bold; color: #555;">Event Coordinators:</p>
                    <ul style="margin: 5px 0 0 0; padding-left: 0; list-style: none;">
                        ${coordinators.map((c: any) => `<li style="color: #666;">${c.name}: <a href="tel:${c.phone}" style="color: #2563eb; text-decoration: none;">${c.phone}</a></li>`).join('')}
                    </ul>
                </div>
            `;
        }

        let emailHtmlTemplate = '';
        let emailSubject = '';

        if (updateType === 'rules') {
            emailSubject = `Important: Rules Update for ${eventTitle}`;
            emailHtmlTemplate = `
              <div style="font-family: sans-serif; line-height: 1.5; color: #333; position: relative; overflow: hidden; padding: 20px; background-color: #fff;">
                <style>
                    @media only screen and (max-width: 600px) {
                        .stamp-img { width: 180px !important; }
                        .stamp-wrapper { margin-top: -80px !important; margin-bottom: 10px !important; }
                    }
                </style>
                <!-- Watermark Layer (Mimicking PDF opacity: 0.12) -->
                ${watermarkHtml}

                <div style="position: relative; z-index: 1;">
                    <h2 style="color: #ea580c;">Rules & Regulations Update</h2>
                    <p>Dear Participant,</p>
                    <p><strong>Registration ID: ${reg.id}</strong></p>
                    ${teamMembersHtml}
                    <p>The rules for <strong>${eventTitle}</strong> have been updated.</p>
                    
                    <div style="background: rgba(255, 247, 237, 0.9); border: 1px solid #fed7aa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #c2410c;">Current Rules</h3>
                        ${rules && Array.isArray(rules) && rules.length > 0 ? `
                            <div style="margin-top: 15px; color: #333;">
                                ${rules.map((r: any) => {
                                    let text = typeof r === 'string' ? r : r.text;
                                    const isNew = typeof r === 'object' && r.highlight;
                                    const badge = isNew ? '<span style="color: #ca8a04; font-size: 10px; text-transform: uppercase; margin-right: 5px; vertical-align: middle;">[NEW]</span>' : '';
                                    const highlightStyle = isNew ? "background-color: #fef08a; padding: 2px 5px; border-radius: 4px;" : "";

                                    // Handle Structured Rules (__SR__)
                                    if (text.startsWith('__SR__')) {
                                        try {
                                            const json = JSON.parse(text.substring(6)); // Remove __SR__
                                            if (json.sections) {
                                                return json.sections.map((sec: any) => `
                                                    <div style="margin-bottom: 15px; ${highlightStyle}">
                                                        ${sec.heading ? `<p style="font-weight: bold; margin: 10px 0 5px 0; color: #ea580c;">${badge}${sec.heading}</p>` : (isNew ? `<p style="margin:0;">${badge}</p>` : '')}
                                                        ${sec.blocks ? sec.blocks.map((b: any) => `
                                                            <div style="margin-bottom: 10px;">
                                                                ${b.title ? `<p style="font-weight: 500; margin: 0 0 5px 0; font-size: 14px;">${b.title}</p>` : ''}
                                                                <${b.style === 'number' ? 'ol' : 'ul'} style="margin: 0; padding-left: 20px;">
                                                                    ${b.items.map((item: string) => `<li style="margin-bottom: 3px;">${item}</li>`).join('')}
                                                                </${b.style === 'number' ? 'ol' : 'ul'} >
                                                            </div>
                                                        `).join('') : ''}
                                                    </div>
                                                `).join('');
                                            }
                                        } catch (e) {
                                            console.error('Failed to parse structured rule', e);
                                            return `<p style="color: #991b1b; ${highlightStyle}">${badge}Error rendering rule</p>`; 
                                        }
                                    }

                                    // Classic Simple Rule
                                    const style = isNew 
                                        ? "margin-bottom: 5px; background-color: #fef08a; padding: 2px 5px; border-radius: 4px; font-weight: bold; color: #854d0e;" 
                                        : "margin-bottom: 5px;";
                                    return `<li style="${style}">${badge}${text}</li>`;
                                }).join('')}
                            </div>
                        ` : '<p style="font-style:italic; color:#666;">Please check website for details.</p>'}

                        ${message ? `<p style="margin-top: 15px; padding-top: 10px; border-top: 1px dashed #fed7aa; font-weight: 500; color: #c2410c;">Note: ${message}</p>` : ''}
                    </div>

                    <p>Please ensure you and your team (if applicable) are aware of these changes.</p>
                    ${coordinatorsHtml}
                    <div style="margin-top: 0; display: flex; align-items: flex-end; justify-content: space-between;">
                        <p style="margin: 0;">Best regards,<br/>The RICO Tech-Team</p>
                        ${stampUrl ? `
                        <div class="stamp-wrapper" style="text-align: right; margin-top: -120px; margin-bottom: 20px; opacity: 0.8; position: relative; z-index: 5;">
                            <img class="stamp-img" src="${stampUrl}" width="250" alt="Stamp" style="width: 250px; max-width: 45%; height: auto; display: inline-block;" />
                        </div>` : ''}
                    </div>
                </div>
              </div>
            `;
        } else {
            // Default: Schedule/Venue Update
            const { date, time, venue } = newDetails || {};
            emailSubject = `Update: ${eventTitle} Details Changed`;
            emailHtmlTemplate = `
              <div style="font-family: sans-serif; line-height: 1.5; color: #333; position: relative; overflow: hidden; padding: 20px; background-color: #fff;">
                <style>
                    @media only screen and (max-width: 600px) {
                        .stamp-img { width: 180px !important; }
                        .stamp-wrapper { margin-top: -80px !important; margin-bottom: 10px !important; }
                    }
                </style>
                <!-- Watermark Layer -->
                ${watermarkHtml}

                <div style="position: relative; z-index: 1;">
                    <h2 style="color: #ea580c;">Event Update Alert</h2>
                    <p>Dear Participant,</p>
                    <p><strong>Registration ID: ${reg.id}</strong></p>
                    ${teamMembersHtml}
                    <p>There has been an update to the details for <strong>${eventTitle}</strong>.</p>
                    <div style="background: rgba(255, 247, 237, 0.9); border: 1px solid #fed7aa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #c2410c;">New Schedule / Venue</h3>
                        <p><strong>Date:</strong> ${date || 'As scheduled'}</p>
                        <p><strong>Time:</strong> ${time || 'As scheduled'}</p>
                        <p><strong>Venue:</strong> ${venue || 'As per details'}</p>
                        ${message ? `<p style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #fed7aa; font-weight: 500; color: #c2410c;">Note: ${message}</p>` : ''}
                    </div>
                    <p>Please make a note of these changes.</p>
                    ${coordinatorsHtml}
                    ${stampUrl ? `
                    <div class="stamp-wrapper" style="text-align: right; margin-top: -120px; margin-bottom: 20px; opacity: 0.8; position: relative; z-index: 5;">
                        <img class="stamp-img" src="${stampUrl}" width="250" alt="Stamp" style="width: 250px; max-width: 45%; height: auto; display: inline-block;" />
                    </div>` : ''}
                    <div style="margin-top: 10px;">
                        <p style="margin: 0;">Best regards,<br/>The RICO Tech-Team</p>
                    </div>
                </div>
              </div>
            `;
        }
        return { subject: emailSubject, html: emailHtmlTemplate };
    };

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
                    html: html.replace('Dear Participant,', `Dear <strong>${reg.full_name}</strong>,`),
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
                    errors.push({ email: reg.email, error: res.error });
                    logs.push({
                        recipient_email: reg.email,
                        template_type: 'update',
                        status: 'failed',
                        provider: provider,
                        event_id: eventId,
                        registration_id: reg.id,
                        details: { eventTitle, newDetails, error: res.error, updateType }
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
                    <p>You successfully sent an event update for <strong>${eventTitle}</strong>.</p>
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
