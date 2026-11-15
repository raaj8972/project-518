import type { Handler } from '@netlify/functions';
import { supabase } from './lib/supabase';
import { invitationReply as reply,ownerForInvitation } from './lib/admin-invitations';
export const handler:Handler=async event=>{
  if(event.httpMethod!=='POST')return reply(405,{error:'Method not allowed'});
  try{
    const owner=await ownerForInvitation(event,supabase);
    if(!owner)return reply(403,{error:'Only owners can remove admin accounts.'});
    let body;try{body=JSON.parse(event.body||'{}');}catch{return reply(400,{error:'Invalid request'});}
    if(typeof body?.user_id!=='string'||body.user_id===owner.id)return reply(400,{error:'Choose another admin account to remove.'});
    const {error}=await supabase.rpc('revoke_admin_account',{p_user_id:body.user_id});
    if(error)return reply(400,{error:'Could not remove this account. Owner accounts are protected.'});
    const {error:authError}=await supabase.auth.admin.deleteUser(body.user_id);
    return reply(200,{success:true,identityCleanupPending:!!authError,message:'Admin access and sessions revoked.'});
  }catch{return reply(500,{error:'Could not revoke admin access. Please try again.'});}
};
