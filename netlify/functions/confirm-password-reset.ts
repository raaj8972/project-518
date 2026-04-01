import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Load environment variables for local testing
import 'dotenv/config';

export const handler: Handler = async (event) => {
  const headers = {
    // 'Access-Control-Allow-Origin': '*' // Restricted by policy,
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
    const { token, newPassword } = JSON.parse(event.body || '{}');
    if (!token || !newPassword) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Token and new password are required' }) };
    }

    // 1. Initialize Supabase
    const { getSupabaseClient } = await import('./lib/supabase');
    const supabase = getSupabaseClient(true); // privileged client

    // 2. Find token session
    let email: string | null = null;
    let foundInFirestore = false;

    const { firebaseAdmin } = await import('./lib/auth-verify');
    if (firebaseAdmin) {
      const db = firebaseAdmin.firestore();
      const tokensRef = db.collection('admin_reset_tokens');
      const snapshot = await tokensRef.where('token', '==', token).get();
      
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        const expiresAt = new Date(docData.expires_at);
        if (expiresAt > new Date()) {
          email = docData.email;
          foundInFirestore = true;
        }
      }
    }

    // Fallback/Check Supabase if not found in Firestore
    if (!email) {
      const { data: sbToken, error: sbTokenErr } = await supabase
        .from('admin_reset_tokens')
        .select('email, expires_at')
        .eq('token', token)
        .maybeSingle();
      
      if (sbToken) {
        const expiresAt = new Date(sbToken.expires_at);
        if (expiresAt > new Date()) {
          email = sbToken.email;
        }
      }
    }

    if (!email) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid or expired token' }) };
    }

    // 3. Resolve user UUID in Supabase
    // Using the resolveSupabaseUuid helper if possible, or direct query
    const { data: sbUser } = await supabase.auth.admin.listUsers();
    const matchedUser = sbUser?.users?.find(u => u.email?.toLowerCase() === email?.toLowerCase());

    if (!matchedUser) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'User not found in system' }) };
    }

    const userId = matchedUser.id;

    // 4. Update Password in Supabase
    console.log(`[confirm-password-reset] Updating Supabase password for: ${email}`);
    const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (updateErr) {
      console.error('[confirm-password-reset] Supabase update error:', updateErr);
      return { statusCode: 500, headers, body: JSON.stringify({ error: updateErr.message }) };
    }

    // 5. Update Password in Firebase (Bridged)
    if (firebaseAdmin) {
      try {
        const fUser = await firebaseAdmin.auth().getUserByEmail(email);
        if (fUser) {
          console.log(`[confirm-password-reset] Syncing Firebase password for: ${email}`);
          await firebaseAdmin.auth().updateUser(fUser.uid, { password: newPassword });
        }
      } catch (fError: any) {
        console.warn('[confirm-password-reset] Firebase sync warning:', fError.message);
      }
    }

    // 6. Delete used token
    try {
      if (foundInFirestore && firebaseAdmin) {
        await firebaseAdmin.firestore().collection('admin_reset_tokens').doc(email).delete();
      }
      await supabase.from('admin_reset_tokens').delete().eq('email', email);
    } catch (delErr) {
      console.warn('[confirm-password-reset] Token cleanup warning:', delErr);
    }

    return { 
      statusCode: 200, 
      headers, 
      body: JSON.stringify({ success: true, message: 'Password has been reset successfully. You can now log in.' }) 
    };

  } catch (err: any) {
    console.error('[confirm-password-reset] Fatal error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || 'Internal Server Error' }) };
  }
};
