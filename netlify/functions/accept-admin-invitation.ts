import type { Handler } from '@netlify/functions';
import { supabase } from './lib/supabase';
import { invitationHash,invitationReply as reply } from './lib/admin-invitations';
export const handler:Handler=async event=>{
  if(event.httpMethod!=='POST')return reply(405,{error:'Method not allowed'});
  let body;try{body=JSON.parse(event.body||'{}');}catch{return reply(400,{error:'Invalid request'});}
  if(typeof body?.token!=='string'||!/^[a-f0-9]{64}$/.test(body.token)||typeof body?.password!=='string'||body.password.length<8)return reply(400,{error:'Use a valid invitation and a password of at least 8 characters.'});
  let invitation:any;let createdUser:string|undefined;
  try{
    const {data,error}=await supabase.rpc('claim_admin_invitation',{p_token_hash:invitationHash(body.token)});
    if(error)throw error;invitation=data?.[0];
    if(!invitation)return reply(400,{error:'This invitation is expired, cancelled or already used. Ask the owner for a new invitation.'});
    const {data:existing,error:adminError}=await supabase.from('admin_users').select('user_id').eq('email',invitation.email).maybeSingle();
    if(adminError)throw adminError;if(existing)throw new Error('Account already activated');
    const {data:authId,error:lookupError}=await supabase.rpc('invited_auth_user_id',{p_invitation_id:invitation.id});
    if(lookupError)throw lookupError;
    let userId=authId;
    if(userId){
      const {error:revokeError}=await supabase.rpc('revoke_user_sessions',{p_user_id:userId});
      if(revokeError)throw revokeError;
      const {error:updateError}=await supabase.auth.admin.updateUserById(userId,{password:body.password,email_confirm:true});
      if(updateError)throw updateError;
    }else{
      const {data:user,error:createError}=await supabase.auth.admin.createUser({email:invitation.email,password:body.password,email_confirm:true,user_metadata:{display_name:invitation.display_name}});
      if(createError||!user.user)throw createError||new Error('Could not create account');
      userId=user.user.id;createdUser=userId;
    }
    const {error:activateError}=await supabase.rpc('activate_admin_invitation',{p_invitation_id:invitation.id,p_user_id:userId});
    if(activateError)throw activateError;
    return reply(200,{success:true,message:'Your password is set and your admin access is active. Sign in to continue.'});
  }catch{
    if(createdUser)await supabase.auth.admin.deleteUser(createdUser);
    if(invitation)await supabase.from('admin_invitations').update({claimed_at:null}).eq('id',invitation.id).eq('token_hash',invitationHash(body.token));
    return reply(500,{error:'Unable to activate this invitation. Try again, or ask the owner to resend it.'});
  }
};
