
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from './lib/email';

// Initialize Supabase Admin client
const { getSupabaseClient } = await import('./lib/supabase');
const supabaseAdmin = getSupabaseClient(true);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

// Reusing the same email style for consistency
const getEmailTemplate = (eventTitle: string, fullName: string, reason: string, stampUrl: string | null, siteUrl: string) => {
    return `
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
        
        <div style="position: relative; z-index: 1;">
            <h2 style="color: #dc2626;">Registration Update</h2>
            <p>Dear <strong>${fullName}</strong>,</p>
            <p>Regarding your registration for <strong>${eventTitle}</strong>:</p>
            
            <div style="margin: 20px 0; padding: 15px; background-color: #fef2f2; border-radius: 8px; border: 2px solid #ef4444;">
                <p style="margin: 0; color: #b91c1c; font-size: 18px; text-transform: uppercase;"><strong>REGISTRATION REJECTED</strong></p>
                <div style="border-top: 1px solid #fecaca; margin: 10px 0;"></div>
                <p style="margin: 10px 0 0 0; color: #7f1d1d;"><strong>Reason for Rejection:</strong></p>
                <p style="margin: 5px 0 0 0; white-space: pre-wrap; font-weight: 500;">${reason}</p>
            </div>
    
            <p>We encourage you to review the requirements and register again.</p>
            
            ${siteUrl ? `
            <div style="margin: 25px 0; text-align: center;">
                <a href="${siteUrl}" style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                    Register Again
                </a>
            </div>
            ` : ''}

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
};

export default async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { registrationId, reason, provider = 'smtp', siteUrl } = await req.json();

        if (!registrationId) {
            throw new Error('Registration ID is required');
        }
        if (!reason || !reason.trim()) {
            throw new Error('Rejection reason is required');
        }
        if (!siteUrl) {
            throw new Error('Site URL is required');
        }

        // Authorization check
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('Missing Authorization header');
        }
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        
        if (authError || !user) {
            throw new Error('Unauthorized');
        }

        // Verify admin status
        const { data: adminUser } = await supabaseAdmin
            .from('admin_users')
            .select('role')
            .eq('user_id', user.id)
            .single();

        if (!adminUser) {
            throw new Error('Forbidden: Not an admin');
        }

        // --- Fetch Assets (Stamp) ---
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

        const { data: reg, error: regError } = await supabaseAdmin
            .from('registrations')
            .select('email, full_name, event_title, event_id')
            .eq('id', registrationId)
            .single();

        if (regError || !reg) {
            throw new Error('Registration not found');
        }

        console.log(`Sending rejection email to ${reg.email} via ${provider}`);

        const emailHtml = getEmailTemplate(
            reg.event_title || 'Event', 
            reg.full_name || 'Member', 
            reason, 
            stampUrl || null, 
            siteUrl
        );

        const result = await sendEmail({
            to: reg.email,
            subject: `Registration Update: ${reg.event_title}`,
            html: emailHtml,
            provider: provider as 'smtp' | 'resend'
        });

        // Log to DB
        await supabaseAdmin.from('email_logs').insert({
            recipient_email: reg.email,
            template_type: 'rejection',
            status: result.success ? 'sent' : 'failed',
            provider: provider,
            event_id: reg.event_id,
            registration_id: registrationId,
            details: { eventTitle: reg.event_title, reason, provider, error: result.error }
        });

        if (result.success) {
            return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
        } else {
            return new Response(JSON.stringify({ error: 'Failed to send email', details: result.error }), { status: 500, headers: corsHeaders });
        }

    } catch (error: any) {
        console.error('Handler error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
};
