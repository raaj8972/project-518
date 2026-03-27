/**
 * Firebase has been removed from this project.
 * All data, auth, and storage operations now use Supabase exclusively.
 *
 * This file is kept as a compatibility stub to avoid breaking imports.
 * The only function retained is updatePasswordDual which calls the backend bridge.
 */

// All Firebase exports are stubs (null) — no Firebase SDK is initialized.
export const auth = null;
export const storage = null;
export const db = null;
export const firebaseDb = null;
export const firebaseAuth = null;
export const firebaseStorage = null;
export default null;

/** Update password by calling the Supabase-backed admin security bridge */
export async function updatePasswordDual(
  email: string,
  newPassword: string,
  supabaseClient: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const token = session?.access_token || null;

    if (!token) {
      return { success: false, error: 'Authentication required for password update.' };
    }

    const res = await fetch('/api/admin-security-controls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'update_password',
        targetUserId: email,
        newPassword
      })
    });

    if (res.ok) {
      return { success: true };
    } else {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || 'Backend synchronization failed.' };
    }
  } catch (err: any) {
    console.error('[Auth] updatePassword error:', err);
    return { success: false, error: err.message || 'Secure update failed.' };
  }
}

// OTP functions removed — Firebase RTDB is no longer available.
// Use Supabase Auth's built-in email OTP (supabase.auth.signInWithOtp) for password reset flows.
export async function generateOTP(_email: string): Promise<{ success: boolean; otp?: string; error?: string }> {
  return { success: false, error: 'OTP via Firebase is disabled. Use Supabase Auth password reset instead.' };
}

export async function verifyOTP(_email: string, _code: string): Promise<{ valid: boolean; error?: string }> {
  return { valid: false, error: 'OTP via Firebase is disabled. Use Supabase Auth password reset instead.' };
}
