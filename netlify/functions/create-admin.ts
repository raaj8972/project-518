import type { Handler } from '@netlify/functions';
import { supabase } from './lib/supabase';
import { flagsForAdminPages,validateAdminPages } from '../../shared/adminAccess';
import { normalizeResetEmail } from './lib/admin-reset';
import { invitationBaseUrl,invitationHash,invitationReply as reply,invitationToken,ownerForInvitation,sendAdminInvitation } from './lib/admin-invitations';
export const handler:Handler=async event=>{
  if(event.httpMethod!=='POST')return reply(405,{error:'Method not allowed'});
  try {
    const owner=await ownerForInvitation(event,supabase);
    if(!owner)return reply(403,{error:'Only owners can invite admins.'});
    let input;try{input=JSON.parse(event.body||'{}');}catch{return reply(400,{error:'Invalid request'});}
    const email=normalizeResetEmail(input?.email);
    const name=typeof input?.displayName==='string'?input.displayName.trim():'';
    if(!email||!name||name.length>100)return reply(400,{error:'Enter a valid name and email address.'});
    if(!['admin','owner'].includes(input.role||'admin'))return reply(400,{error:'Invalid account role'});
    let pages:string[];try{pages=validateAdminPages(input.allowedPages||[]);}catch{return reply(400,{error:'Choose valid management pages.'});}
    const {data:existing,error:lookupError}=await supabase.from('admin_users').select('user_id').eq('email',email).maybeSingle();
    if(lookupError)throw lookupError;
    if(existing)return reply(409,{error:'This email already has an admin account. Edit its permissions instead.'});
    const base=invitationBaseUrl(event);
    const token=invitationToken();
    const {data:invitation,error}=await supabase.from('admin_invitations').insert({email,display_name:name,role:input.role||'admin',allowed_pages:pages,permission_flags:flagsForAdminPages(pages),token_hash:invitationHash(token),invited_by:owner.id}).select('id,email,display_name,role,allowed_pages').single();
    if(error?.code==='23505')return reply(409,{error:'An invitation already exists for this email. Use Resend invitation.'});
    if(error)throw error;
    const delivery=await sendAdminInvitation(supabase,invitation,token,base);
    return reply(200,{success:true,invitation:{id:invitation.id,email},delivery,message:delivery==='sent'?'Invitation sent. They can set their password from the email.':'Invitation saved, but email delivery failed. Use Resend invitation to try again.'});
  }catch{return reply(500,{error:'Could not prepare the admin invitation. Please try again.'});}
};
