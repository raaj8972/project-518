// Shared portal access codes support a short numeric PIN or a full password.
export const portalSecretHelp='Use a 4–8 digit PIN or a password with at least 8 characters (maximum 72 bytes).';
export function validPortalSecret(value:unknown):value is string {
 return typeof value==='string'&&value===value.trim()&&new TextEncoder().encode(value).length<=72&&(/^[0-9]{4,8}$/.test(value)||value.length>=8);
}
