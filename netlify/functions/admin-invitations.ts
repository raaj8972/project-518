import type { Handler } from '@netlify/functions';
import { supabase } from './lib/supabase';
import { flagsForAdminPages,validateAdminPages } from '../../shared/adminAccess';
import { invitationBaseUrl,invitationHash,invitationReply as reply,invitationToken,ownerForInvitation,sendAdminInvitation } from './lib/admin-invitations';
export const handler:Handler=async event=>{
  if(event.httpMethod!=='POST')return reply(405,{error:'Method not allowed'});
  try{
    if(!await ownerForInvitation(event,supabase))return reply(403,{error:'Only owners can manage invitations and page access.'});
    let body;try{body=JSON.parse(event.body||'{}');}catch{return reply(400,{error:'Invalid request'});}
    if(body.action==='list'){
      const {data,error}=await supabase.from('admin_invitations').select('id,email,display_name,role,allowed_pages,expires_at,sent_at,delivery_status').order('created_at',{ascending:false});
      if(error)throw error;return reply(200,{invitations:data||[]});
    }
    if(body.action==='permissions'){
      let pages:string[];try{pages=validateAdminPages(body.allowedPages);}catch{return reply(400,{error:'Choose valid management pages.'});}
      const {data:target,error:targetError}=await supabase.from('admin_users').select('role,is_primary').eq('user_id',body.userId).maybeSingle();
      if(targetError)throw targetError;
      if(!target)return reply(404,{error:'Admin account no longer exists.'});
      if(target.role==='owner'||target.is_primary)return reply(400,{error:'Owners have full access. Page limits apply to admins.'});
      const {error}=await supabase.from('admin_permissions').upsert({user_id:body.userId,allowed_pages:pages,page_access_configured:true,...flagsForAdminPages(pages),updated_at:new Date().toISOString()},{onConflict:'user_id'});
      if(error)throw error;return reply(200,{success:true});
    }
    if(typeof body.id!=='string')return reply(400,{error:'Invitation ID is required.'});
    if(body.action==='cancel'){
      const {data,error}=await supabase.from('admin_invitations').delete().eq('id',body.id).is('claimed_at',null).select('id');
      if(error)throw error;if(!data?.length)return reply(409,{error:'Invitation already accepted or being processed.'});
      return reply(200,{success:true});
    }
    if(body.action==='resend'){
      const base=invitationBaseUrl(event),token=invitationToken();
      const {data,error}=await supabase.from('admin_invitations').update({token_hash:invitationHash(token),expires_at:new Date(Date.now()+86400000).toISOString(),sent_at:new Date().toISOString(),delivery_status:'pending'}).eq('id',body.id).is('claimed_at',null).lt('sent_at',new Date(Date.now()-60000).toISOString()).select('id,email,display_name,role,allowed_pages').maybeSingle();
      if(error)throw error;if(!data)return reply(429,{error:'Wait 60 seconds before resending, or refresh if this invitation was already accepted.'});
      const delivery=await sendAdminInvitation(supabase,data,token,base);
      return reply(delivery==='sent'?200:502,{success:delivery==='sent',...(delivery==='sent'?{}:{error:'Email delivery failed. Please try resending shortly.'})});
    }
    return reply(400,{error:'Invalid action'});
  }catch{return reply(500,{error:'Unable to update admin access. Please try again.'});}
};
