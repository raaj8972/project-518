import { createClient } from '@supabase/supabase-js';
import { sendEmail } from './lib/email';

export default async (req: Request) => {
  // CORS headers
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

    // Verify Is Admin
    const { data: adminUser } = await supabaseAdmin
        .from('admin_users')
        .select('role')
        .eq('user_id', user.id)
        .single();
    
    if (!adminUser) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers });
    }

    const { registrationId, email, fullName, eventTitle, eventDate, eventTime, eventVenue, provider = 'smtp', coordinators } = await req.json();

    const coordinatorsHtml = coordinators ? `
        <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
            <p style="margin: 0 0 10px 0; color: #666;"><strong>Need Help? Contact Coordinators:</strong></p>
            <p style="margin: 0; font-size: 14px; color: #444;">${coordinators}</p>
        </div>
    ` : '';

    const emailHtml = `
      <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
        <h2 style="color: #0d9488;">Registration Approved!</h2>
        <p>Dear <strong>${fullName}</strong>,</p>
        <p>We are pleased to inform you that your registration for <strong>${eventTitle}</strong> has been approved.</p>
        
        <div style="margin-bottom: 20px; padding: 10px; border-left: 4px solid #0d9488; background-color: #f9fafb;">
            <p style="margin: 0 0 10px 0;"><strong>Event Details:</strong></p>
            <ul style="list-style: none; padding: 0; margin: 0;">
                <li style="margin-bottom: 5px;">📅 <strong>Date:</strong> ${eventDate || 'TBA'}</li>
                <li style="margin-bottom: 5px;">⏰ <strong>Time:</strong> ${eventTime || 'TBA'}</li>
                <li>📍 <strong>Venue:</strong> ${eventVenue || 'TBA'}</li>
            </ul>
        </div>

        <p>Please present this ID at the venue entrance.</p>
        
        ${coordinatorsHtml}

        <p style="margin-top: 30px;">Best regards,<br/>The RICO Team</p>
      </div>
    `;

    const result = await sendEmail({
        to: email,
        subject: `Registration Approved: ${eventTitle}`,
        html: emailHtml,
        provider: provider as 'smtp' | 'resend'
    });

    if (result.success) {
        return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    } else {
        return new Response(JSON.stringify({ error: 'Failed to send email via SMTP', details: result.error }), { status: 500, headers });
    }

  } catch (error: any) {
    console.error('Handler error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
};
