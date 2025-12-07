// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export default async (request: Request) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Missing RESEND_API_KEY' }),
        { status: 500, headers }
      );
    }

    // Verify Auth (only admins can trigger this)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://isfqhascrdzaoebhuohs.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseServiceKey) {
       return new Response(
        JSON.stringify({ error: 'Server configuration error: Missing SUPABASE_SERVICE_ROLE_KEY' }),
        { status: 500, headers }
      );
    }

    // Initialize Supabase Admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers });
    }

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
        return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required' }), { status: 403, headers });
    }

    // Parse Request
    const { registrationId, email, fullName, eventTitle } = await request.json();

    if (!email || !fullName) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers });
    }

    // Send Email via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: Deno.env.get('EMAIL_SENDER') || 'onboarding@resend.dev', // Default to Resend test domain
        to: [email],
        subject: `Registration Approved: ${eventTitle}`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
            <h2 style="color: #0d9488;">Registration Approved!</h2>
            <p>Dear <strong>${fullName}</strong>,</p>
            <p>We are pleased to inform you that your registration for <strong>${eventTitle}</strong> has been approved.</p>
            <div style="background: #f0fdfa; border: 1px solid #ccfbf1; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; font-size: 0.9em; color: #555;">Registration ID</p>
              <p style="margin: 5px 0 0; font-size: 1.2em; font-weight: bold; color: #0f172a;">${registrationId}</p>
            </div>
            <p>Please present this ID at the venue entrance.</p>
            <p>Best regards,<br/>The RICO Team</p>
          </div>
        `,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
       console.error('Resend Error:', data);
       return new Response(JSON.stringify({ error: 'Failed to send email via Resend', details: data }), { status: 500, headers });
    }

    return new Response(JSON.stringify({ success: true, data }), { status: 200, headers });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
};

export const config = { path: '/api/send-confirmation' };
