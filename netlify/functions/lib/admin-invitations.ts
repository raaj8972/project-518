import crypto from 'node:crypto';
import type { HandlerEvent } from '@netlify/functions';
import { verifyAdmin } from './auth-verify';
import { sendEmail } from './email';
export const invitationHeaders = { 'Content-Type':'application/json', 'Cache-Control':'no-store' };
export const invitationHash = (token:string) => crypto.createHash('sha256').update(token).digest('hex');
export const invitationToken = () => crypto.randomBytes(32).toString('hex');
export const invitationReply = (statusCode:number,data:object) => ({statusCode,headers:invitationHeaders,body:JSON.stringify(data)});
export async function ownerForInvitation(event: HandlerEvent, client:any) {
  const verified=await verifyAdmin(event.headers.authorization || event.headers.Authorization,client);
  return verified.isOwner ? verified.user : null;
}
export function invitationBaseUrl(event:HandlerEvent) {
  const host=event.headers?.host || '';
  if (process.env.NODE_ENV!=='production' && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return `http://${host}`;
  const configured=process.env.APP_URL || process.env.URL || process.env.SITE_URL || process.env.VITE_SITE_URL;
  if (!configured) throw new Error('Configure APP_URL before sending admin invitations.');
  const url=new URL(configured);
  if(url.protocol!=='https:' && !['localhost','127.0.0.1'].includes(url.hostname)) throw new Error('Invitation URL must use HTTPS.');
  return url.origin;
}
const escapeHtml=(text:string)=>text.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
export async function sendAdminInvitation(client:any, invitation:any, token:string, baseUrl:string) {
  const link=`${baseUrl}/accept-admin-invite#token=${token}`;
  const result=await sendEmail({to:invitation.email,provider:'resend',subject:'You’re invited to manage RICORRENZA',html:`<div style="font-family:sans-serif;max-width:540px;margin:auto;padding:30px;background:#191a1e;color:#f0dcc8;border:1px solid #83654d;border-radius:14px"><h2>Welcome to the festival team</h2><p>Hello ${escapeHtml(invitation.display_name)},</p><p>The festival owner has invited you as ${invitation.role==='owner'?'an owner':'an admin'}. Set your own password to activate your account.</p><p>${invitation.role==='owner'?'Your owner account has full access.':`You have access to ${invitation.allowed_pages.length} selected management pages. Your owner can update these permissions later.`}</p><p style="margin:28px 0"><a href="${escapeHtml(link)}" style="display:inline-block;padding:13px 20px;background:#a34455;color:#fff0e8;border-radius:7px;text-decoration:none">Set my password</a></p><p>This invitation expires in 24 hours and can be used once. Your password is never included in this email.</p><p>If you weren’t expecting an invitation, ignore this email.</p></div>`});
  const delivery=result.success?'sent':'failed';
  const {error}=await client.from('admin_invitations').update({delivery_status:delivery}).eq('id',invitation.id).eq('token_hash',invitationHash(token));
  if(error) throw error;
  return delivery;
}
