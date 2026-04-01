import { createClient } from '@supabase/supabase-js';
import { sendEmail } from './lib/email';

export default async (req: Request) => {
  // CORS headers
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers });
    }

    const { getSupabaseClient } = await import('./lib/supabase');
    const supabaseAdmin = getSupabaseClient(true);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers });
    }

    // Verify Is Admin
    const { data: adminUser } = await supabaseAdmin
        .from('admin_users')
        .select('role')
        .eq('user_id', user.id)
        .single();
    
    if (!adminUser) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers });
    }

    const { registrationId, email, fullName, eventTitle, eventDate, eventTime, eventVenue, provider = 'smtp', coordinators, teamMembers, pdfAttachment } = await req.json();

    console.log('[send-confirmation] Processing email for:', { registrationId, email, hasPDF: !!pdfAttachment, pdfSize: pdfAttachment?.length });

    // --- Fetch Assets (Watermark/Stamp) ---
    const { data: bucketFiles } = await supabaseAdmin.storage.from('pdf-watermarks').list();
    
    // Helper to find file
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

    // --- Fetch Rules ---
    const { data: eventData } = await supabaseAdmin
        .from('events')
        .select('rules')
        .eq('title', eventTitle)
        .single();
    const rules = eventData?.rules;

    let teamHtml = '';
    if (teamMembers && Array.isArray(teamMembers) && teamMembers.length > 0) {
        const membersList = teamMembers.map((m: any) => m.name || m).join(', ');
        teamHtml = `
            <div style="margin: 20px 0; padding: 15px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <p style="margin: 0 0 5px 0; color: #475569; font-size: 14px;"><strong>Team Members:</strong></p>
                <p style="margin: 0; color: #334155;">${membersList}</p>
            </div>
        `;
    }

    const coordinatorsHtml = coordinators ? `
        <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
            <p style="margin: 0 0 10px 0; color: #666;"><strong>Need Help? Contact Coordinators:</strong></p>
            <p style="margin: 0; font-size: 14px; color: #444;">${coordinators}</p>
        </div>
    ` : '';


    const isTBA = eventDate === 'TBA' || eventTime === 'TBA' || eventVenue === 'TBA' || !eventDate || !eventTime || !eventVenue;
    const tbaMessage = isTBA ? 
        `<p style="margin-top: 15px; background-color: #fff3cd; color: #856404; padding: 10px; border-radius: 4px; border: 1px solid #ffeeba;">
            <strong>Note:</strong> Some event details are currently "To Be Announced". 
            When updated, you will be informed through <strong>Email and WhatsApp</strong>.
         </p>` : '';

    // Rules HTML Generation
    let rulesHtml = '';
    if (rules && Array.isArray(rules) && rules.length > 0) {
        rulesHtml = `
            <div style="background: rgba(255, 247, 237, 0.9); border: 1px solid #fed7aa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #c2410c;">Event Rules</h3>
                <div style="margin-top: 15px; color: #333;">
                    ${rules.map((r: any) => {
                        let text = typeof r === 'string' ? r : r.text;
                        const isNew = typeof r === 'object' && r.highlight; // Just in case, though unlikely for approval
                        const badge = isNew ? '<span style="color: #ca8a04; font-size: 10px; text-transform: uppercase; margin-right: 5px; vertical-align: middle;">[IMPORTANT]</span>' : '';
                        
                        // Handle Structured Rules (__SR__)
                        if (text.startsWith('__SR__')) {
                            try {
                                const json = JSON.parse(text.substring(6));
                                if (json.sections) {
                                    return json.sections.map((sec: any) => `
                                        <div style="margin-bottom: 15px;">
                                            ${sec.heading ? `<p style="font-weight: bold; margin: 10px 0 5px 0; color: #ea580c;">${badge}${sec.heading}</p>` : ''}
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
                            } catch (e) { return `<p style="color:red">Error rendering rule</p>`; }
                        }
                        return `<li style="margin-bottom: 5px;">${badge}${text}</li>`;
                    }).join('')}
                </div>
            </div>
        `;
    }


    const emailHtml = `
      <div class="email-container" style="font-family: sans-serif; line-height: 1.5; color: #333333 !important; position: relative; overflow: hidden; padding: 20px; background-color: #ffffff !important;">
        <style>
            :root { color-scheme: light; supported-color-schemes: light; }
            @media only screen and (max-width: 600px) {
                .stamp-img { width: 350px !important; max-width: 100% !important; }
                .stamp-wrapper { margin-top: -175px !important; margin-bottom: 20px !important; }
            }
            /* Force Light Mode */
            .email-container {
                background-color: #ffffff !important;
                color: #333333 !important;
            }
        </style>
        
        <!-- Watermark Removed -->
        
        <div style="position: relative; z-index: 1;">
            <h2 style="color: #0d9488;">Registration Approved!</h2>
            <p>Dear <strong>${fullName}</strong>,</p>
            <p>We are pleased to inform you that your registration for <strong>${eventTitle}</strong> has been approved.</p>
            
            <div style="margin: 20px 0; padding: 15px; background-color: #f0fdfa; border-radius: 8px; border: 1px solid #ccfbf1;">
                <p style="margin: 0; font-size: 18px; color: #0f766e;"><strong>Registration ID: ${registrationId}</strong></p>
            </div>
    
            ${teamHtml}
    
            <div style="margin-bottom: 20px; padding: 10px; border-left: 4px solid #0d9488; background-color: #f9fafb;">
                <p style="margin: 0 0 10px 0;"><strong>Event Details:</strong></p>
                <ul style="list-style: none; padding: 0; margin: 0;">
                    <li style="margin-bottom: 5px;">📅 <strong>Date:</strong> ${eventDate || 'TBA'}</li>
                    <li style="margin-bottom: 5px;">⏰ <strong>Time:</strong> ${eventTime || 'TBA'}</li>
                    <li>📍 <strong>Venue:</strong> ${eventVenue || 'TBA'}</li>
                </ul>
            </div>
            
            ${rulesHtml}
            ${tbaMessage}
    
            <p>Please present this ID at the venue entrance.</p>
            
            ${pdfAttachment ? '<p style="margin-top: 20px; padding: 12px; background-color: #eff6ff; border-radius: 4px; border: 1px solid #bfdbfe;"><strong>📎 Registration Receipt:</strong> Your registration receipt is attached to this email as a PDF document.</p>' : ''}
            
            ${coordinatorsHtml}
    
            <div style="margin-top: 30px; display: flex; align-items: flex-end; justify-content: space-between;">
                <p style="margin: 0;">Best regards,<br/>The RICO Tech-Team</p>
                ${stampUrl ? `
                <div class="stamp-wrapper" style="text-align: right; margin-top: -120px; margin-bottom: 20px; opacity: 0.8; position: relative; z-index: 5; user-select: none; pointer-events: none;">
                    <div style="
                        display: inline-block;
                        width: 380px;
                        max-width: 80%;
                        height: 0;
                        padding-bottom: 28%;
                        background-image: url('${stampUrl}');
                        background-size: contain;
                        background-repeat: no-repeat;
                        background-position: center;
                        position: relative;
                    ">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/c/ca/1x1.png" alt="Stamp" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0;" />
                    </div>
                </div>` : ''}
            </div>
        </div>
      </div>
    `;

    // Prepare attachments
    const attachments = pdfAttachment ? [{
        filename: `Registration-Receipt-${registrationId}.pdf`,
        content: pdfAttachment
    }] : undefined;

    const result = await sendEmail({
        to: email,
        subject: `Registration Approved: ${eventTitle}`,
        html: emailHtml,
        provider: provider as 'smtp' | 'resend',
        attachments
    });

    // Log to DB (Success or Failure)
    await supabaseAdmin.from('email_logs').insert({
        recipient_email: email,
        template_type: 'confirmation',
        status: result.success ? 'sent' : 'failed',
        provider: provider,
        event_id: (await supabaseAdmin.from('events').select('id').eq('title', eventTitle).single()).data?.id,
        registration_id: registrationId,
        details: { eventTitle, eventDate, provider, error: result.error }
    });

    if (result.success) {
        return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    } else {
        console.error('[send-confirmation] Email sending failed:', result.error);
        console.error('[send-confirmation] Error details:', result.details);
        
        // Return detailed error information
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Failed to send confirmation email', 
          message: result.error || 'Unknown error',
          details: result.details || {}
        }), { status: 500, headers });
    }

  } catch (error: any) {
    console.error('[send-confirmation] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message || String(error)
    }), { status: 500, headers });
  }
};
