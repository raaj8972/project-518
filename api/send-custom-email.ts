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

    if (!supabaseUrl || !supabaseServiceKey) {
       return new Response(JSON.stringify({ error: 'Server config error' }), { status: 500, headers });
    }

    // Verify Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers });
    }

    // Verify Admin
    const { data: adminUser } = await supabaseAdmin
        .from('admin_users')
        .select('role')
        .eq('user_id', user.id)
        .single();
    
    if (!adminUser) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers });
    }

    const { registrationId, templateType, customSubject, customMessage, additionalData, provider = 'smtp' } = await req.json();

    // --- Fetch Stamp (same logic as confirmation email) ---
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

    // Fetch Registration & Event
    const { data: registration } = await supabaseAdmin
        .from('registrations')
        .select('*, events(title, date, time, venue)')
        .eq('id', registrationId)
        .single();

    if (!registration) {
        return new Response(JSON.stringify({ error: 'Registration not found' }), { status: 404, headers });
    }

    const event = registration.events;
    const eventTitle = event?.title || registration.event_title;

    let subject = '';
    let htmlContent = '';
    
    // --- Templates ---
    const baseStyles = `
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { padding: 30px 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; background: #f9fafb; }
        .btn { display: inline-block; padding: 10px 20px; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 15px; }
        @media only screen and (max-width: 600px) {
            .stamp-img { width: 350px !important; max-width: 100% !important; }
            .stamp-wrapper { margin-top: -175px !important; margin-bottom: 20px !important; }
        }
    `;

    if (templateType === 'winner') {
        const position = additionalData?.position || 'Winner';
        subject = `🎉 Congratulations! You are a ${position} in ${eventTitle}`;
        htmlContent = `
            <div class="container" style="border: 2px solid #fbbf24;">
                <div class="header" style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-bottom: 2px solid #fbbf24;">
                    <h1 style="color: #b45309; margin: 0; font-size: 28px;">🏆 CONGRATULATIONS!</h1>
                </div>
                <div class="content">
                    <p style="font-size: 18px;">Dear <strong>${registration.full_name}</strong>,</p>
                    <p>We are thrilled to announce that you have been selected as:</p>
                    <div style="background: #fffbeb; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 1px dashed #d97706;">
                        <span style="font-size: 24px; font-weight: bold; color: #b45309; display: block;">${position}</span>
                        <span style="display: block; font-size: 14px; color: #92400e; margin-top: 5px;">in ${eventTitle}</span>
                    </div>
                    <p>${customMessage || "We are incredibly proud of your achievement. The organizers will be in touch shortly regarding the next steps and prize distribution."}</p>
                    
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
    } else if (templateType === 'selection') {
        const stage = additionalData?.stage || 'the next round';
        subject = `Selection Update: You're selected for ${stage}!`;
        htmlContent = `
            <div class="container" style="border: 1px solid #2dd4bf;">
                <div class="header" style="background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%); border-bottom: 1px solid #2dd4bf;">
                    <h1 style="color: #0f766e; margin: 0;">You're Selected!</h1>
                </div>
                <div class="content">
                    <p style="font-size: 16px;">Dear <strong>${registration.full_name}</strong>,</p>
                    <p>We are pleased to inform you that you have cleared the <strong>${additionalData?.roundCleared || 'preliminary round'}</strong> for <strong>${eventTitle}</strong>.</p>
                    <div style="background: #f0fdfa; padding: 15px; border-left: 4px solid #0d9488; margin: 20px 0;">
                        <p style="margin: 0; color: #115e59; font-weight: bold;">Selected for: ${stage}</p>
                    </div>
                    <p>${customMessage || "Please stay tuned for further schedule details."}</p>
                    
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
    } else {
        // Custom
        subject = customSubject || `Message regarding ${eventTitle}`;
        htmlContent = `
            <div class="container">
                <div class="header" style="background: #f3f4f6;">
                    <h2 style="color: #1f2937; margin: 0;">Update from ${eventTitle}</h2>
                </div>
                <div class="content">
                    <p>Dear <strong>${registration.full_name}</strong>,</p>
                    <div style="white-space: pre-line;">${customMessage}</div>
                    
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
    }

    // Wrap in full HTML
    const finalHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>${baseStyles}</style>
        </head>
        <body style="background-color: #f3f4f6; padding: 20px;">
            ${htmlContent}
            <div class="footer">
                <p>Sent by RICO Event Team</p>
                <p style="font-size: 10px; color: #9ca3af;">Registration ID: ${registration.id}</p>
            </div>
        </body>
        </html>
    `;

    // Send
    const result = await sendEmail({
        to: registration.email,
        subject,
        html: finalHtml,
        provider: provider as 'smtp' | 'resend'
    });

    // Log
    await supabaseAdmin.from('email_logs').insert({
        recipient_email: registration.email,
        template_type: templateType,
        status: result.success ? 'sent' : 'failed',
        provider,
        event_id: registration.event_id || null,
        registration_id: registration.id,
        details: { subject, templateType, error: result.error, additionalData }
    });

    if (result.success) {
        return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    } else {
        console.error('[send-custom-email] Email sending failed:', result.error);
        console.error('[send-custom-email] Error details:', result.details);
        
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Failed to send custom email',
          message: result.error || 'Unknown error',
          details: result.details || {}
        }), { status: 500, headers });
    }

  } catch (error: any) {
    console.error('Handler error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
};
