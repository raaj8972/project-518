import { Handler } from '@netlify/functions';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Load environment variables for local testing
import 'dotenv/config';

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const { email } = JSON.parse(event.body || '{}');
    if (!email) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email is required' }) };
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Initialize Supabase
    const { getSupabaseClient } = await import('./lib/supabase');
    const supabase = getSupabaseClient(true); // privileged client

    // 2. Check if email is an authorized user (admin or owner)
    const { data: adminUser, error: adminErr } = await supabase
      .from('admin_users')
      .select('email, role')
      .eq('email', normalizedEmail)
      .in('role', ['admin', 'owner'])
      .maybeSingle();

    if (adminErr) {
      console.error('[request-password-reset] Database error:', adminErr);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error during verification' }) };
    }

    if (!adminUser) {
      console.log(`🚫 Password reset REJECTED for ${normalizedEmail}: Not an admin or owner. Skipping email to save tokens.`);
      // Security best practice: don't reveal if user exists or has correct role.
      return { 
        statusCode: 200, 
        headers, 
        body: JSON.stringify({ success: true, message: 'If that email is registered and authorized, you will receive a reset link shortly.' }) 
      };
    }

    // 3. Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    // 4. Store token in Firestore (or Supabase). 
    // Since the project uses Firestore as primary for some admin meta, let's use it.
    const { firebaseAdmin } = await import('./lib/auth-verify');
    if (!firebaseAdmin) {
       // Fallback to Supabase if Firebase Admin is not configured
       const { error: insertErr } = await supabase
          .from('admin_reset_tokens')
          .upsert({ email: normalizedEmail, token, expires_at: expiresAt }, { onConflict: 'email' });
       
       if (insertErr) {
          console.error('[request-password-reset] Supabase token store error:', insertErr);
          return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to store reset token' }) };
       }
    } else {
       const db = firebaseAdmin.firestore();
       // Using email as doc ID to prevent multiple active reset links per user
       await db.collection('admin_reset_tokens').doc(normalizedEmail).set({
          email: normalizedEmail,
          token,
          expires_at: expiresAt,
          created_at: new Date().toISOString()
       });
    }

    // 5. Send email
    const { sendEmail } = await import('./lib/email');
    const resetLink = `${process.env.URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You requested a password reset for your ${adminUser.role} account at RICORRENZA.</p>
        <p>Please click the button below to set a new password. This link will expire in 15 minutes.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
        </div>
        <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">Link: ${resetLink}</p>
      </div>
    `;

    const emailRes = await sendEmail({
      to: normalizedEmail,
      subject: 'RICORRENZA Admin - Password Reset Request',
      html: emailHtml,
      provider: 'resend' // Explicitly use Resend
    });

    if (!emailRes.success) {
      console.error('[request-password-reset] Email send failed:', emailRes.error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to send reset email' }) };
    }

    return { 
      statusCode: 200, 
      headers, 
      body: JSON.stringify({ success: true, message: 'If that email is registered, you will receive a reset link shortly.' }) 
    };

  } catch (err: any) {
    console.error('[request-password-reset] Fatal error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || 'Internal Server Error' }) };
  }
};
