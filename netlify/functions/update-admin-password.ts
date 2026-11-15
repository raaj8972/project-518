import type { Handler } from '@netlify/functions';
import { supabase as client } from './lib/supabase';
import { verifyAdmin } from './lib/auth-verify';

// Compatibility endpoint for existing signed-in clients. New UI uses email recovery for team accounts.
export const handler: Handler = async event => {
 const reply=(statusCode:number,data:object)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(data)});
 if(event.httpMethod!=='POST')return reply(405,{error:'Method not allowed'});
 try{
  const auth=await verifyAdmin(event.headers.authorization||event.headers.Authorization,client);
  if(!auth.isAdmin||!auth.user)return reply(401,{error:'Sign in to your admin account.'});
  const {userId,password}=JSON.parse(event.body||'{}');
  if(typeof userId!=='string'||typeof password!=='string'||password.length<8)return reply(400,{error:'Choose an account and a password of at least 8 characters.'});
  if(!auth.isOwner&&userId!==auth.user.id)return reply(403,{error:'You can only change your own password.'});
  const {data:target,error}=await client.from('admin_users').select('user_id').eq('user_id',userId).in('role',['owner','admin']).maybeSingle();
  if(error)throw error;if(!target)return reply(404,{error:'Admin account not found.'});
  const {error:updateError}=await client.auth.admin.updateUserById(userId,{password});if(updateError)throw updateError;
  const {error:revokeError}=await client.rpc('revoke_user_sessions',{p_user_id:userId});
  return reply(200,{success:true,...(revokeError?{warning:'Password saved. Existing sessions could not be revoked; retry from Sessions & devices.'}:{})});
 }catch{return reply(500,{error:'Unable to update the password. Please try again.'});}
};
