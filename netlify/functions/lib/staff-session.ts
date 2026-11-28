import type { EmailOtpType, SupabaseClient } from '@supabase/supabase-js';

export interface StaffMagicLink {
  token_hash: string;
  type: EmailOtpType;
}

/**
 * Issue a magic-link verification token for synthetic staff accounts.
 * When generateLink provisions a new unconfirmed user, GoTrue returns a
 * "signup" token that verifyOtp({ type: 'magiclink' }) rejects with
 * "Email link is invalid or has expired"; confirm and regenerate so the
 * returned token always matches type "magiclink".
 */
export async function issueStaffMagicLink(
  client: SupabaseClient<any, any, any>,
  email: string,
  appMetadata: Record<string, unknown>,
): Promise<StaffMagicLink> {
  const { data: initial, error: linkError } = await client.auth.admin.generateLink({ type: 'magiclink', email });
  if (linkError || !initial?.user || !initial.properties?.hashed_token) {
    throw new Error('Identity unavailable');
  }

  const { error: metadataError } = await client.auth.admin.updateUserById(initial.user.id, {
    app_metadata: { ...initial.user.app_metadata, ...appMetadata },
  });
  if (metadataError) throw metadataError;

  const verificationType = initial.properties.verification_type as EmailOtpType | undefined;
  if (verificationType && verificationType !== 'magiclink') {
    const { error: confirmError } = await client.auth.admin.updateUserById(initial.user.id, {
      email_confirm: true,
    });
    if (confirmError) throw confirmError;

    const { data: regenerated, error: regenerateError } = await client.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
    if (regenerateError || !regenerated?.properties?.hashed_token) {
      throw new Error('Identity unavailable');
    }
    return {
      token_hash: regenerated.properties.hashed_token,
      type: (regenerated.properties.verification_type as EmailOtpType | undefined) || 'magiclink',
    };
  }

  return {
    token_hash: initial.properties.hashed_token,
    type: verificationType || 'magiclink',
  };
}
