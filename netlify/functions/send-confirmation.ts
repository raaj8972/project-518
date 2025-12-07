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

    const { registrationId, email, fullName, eventTitle, eventDate, eventTime, eventVenue, provider = 'smtp', coordinators, teamMembers } = await req.json();

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

    const emailHtml = `
      <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
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
        
        ${tbaMessage}

        <p>Please present this ID at the venue entrance.</p>
        
        ${coordinatorsHtml}

        <p style="margin-top: 30px;">Best regards,<br/>The RICO Tech-Team</p>
      </div>
    `;

    const result = await sendEmail({
        to: email,
        subject: `Registration Approved: ${eventTitle}`,
        html: emailHtml,
        provider: provider as 'smtp' | 'resend'
    });

    if (result.success) {
        // Log to DB
        await supabaseAdmin.from('email_logs').insert({
            recipient_email: email,
            template_type: 'confirmation',
            status: 'sent',
            provider: provider,
            event_id: (await supabaseAdmin.from('events').select('id').eq('title', eventTitle).single()).data?.id, // Best effort lookup
            registration_id: registrationId, // storing the custom ID string for reference
            details: { eventTitle, eventDate, provider }
        });

        return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    } else {
        return new Response(JSON.stringify({ error: 'Failed to send email via SMTP', details: result.error }), { status: 500, headers });
    }

  } catch (error: any) {
    console.error('Handler error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
};
