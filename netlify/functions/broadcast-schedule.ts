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

    // Fetch ALL distinct emails
    const { data: registrations } = await supabaseAdmin
        .from('registrations')
        .select('email, full_name')
        .eq('status', 'approved');

    if (!registrations || registrations.length === 0) {
        return new Response(JSON.stringify({ success: true, message: 'No participants' }), { status: 200, headers });
    }

    // Dedup
    const uniqueMap = new Map();
    registrations.forEach(r => {
        if (!uniqueMap.has(r.email)) uniqueMap.set(r.email, r.full_name);
    });
    const recipients = Array.from(uniqueMap.entries()).map(([email, name]) => ({ email, name }));

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

    const emailSubject = `📅 RICO Festival Schedule is LIVE!`;
    const emailHtmlRaw = `
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
            <h2 style="color: #0d9488;">The Schedule is Here!</h2>
            <p>Dear Participant,</p>
            <p>We are excited to announce that the full schedule for <strong>RICO 2026</strong> has been uploaded/updated.</p>
            <p>Click the link below to view the timeline of events:</p>
            <div style="margin: 30px 0; text-align: center;">
                <a href="https://ricorrenza.fun/schedule" style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Schedule</a>
            </div>
            <p>Plan your days and get ready for the excitement!</p>
            
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
            if (res.success) successCount++;
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
