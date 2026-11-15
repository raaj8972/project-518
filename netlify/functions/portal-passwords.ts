import { validPortalSecret, portalSecretHelp } from '../../shared/portalCredentials';
import type { Handler } from '@netlify/functions';
import { getSupabaseClient } from './lib/supabase';
import { verifyAdmin } from './lib/auth-verify';
import { openPortalPassword, sealPortalPassword } from './lib/portal-password-vault';
export const handler:Handler=async event=>{
 const reply=(statusCode:number,data:object)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store, private','Pragma':'no-cache'},body:JSON.stringify(data)});
 if(event.httpMethod!=='POST')return reply(405,{error:'Method not allowed.'});
 try{
  const client=getSupabaseClient(true),auth=await verifyAdmin(event.headers.authorization||event.headers.Authorization,client);
  if(!auth.user||!auth.isOwner)return reply(403,{error:'Only owners can view or change portal passwords.'});
  let body:any;try{body=JSON.parse(event.body||'{}');}catch{return reply(400,{error:'Invalid request.'});}
  if(!['council','cr','security'].includes(body.portal))return reply(400,{error:'Choose a valid portal.'});
  const id=body.portal==='council'?'1':body.id;
  if(typeof id!=='string'||!id.trim()||id.length>200)return reply(400,{error:'Choose an account.'});
  if(body.action==='save'){
   const password=body.password;
   if(!validPortalSecret(password))return reply(400,{error:portalSecretHelp});
   const {data,error}=await client.rpc('save_portal_password_copy',{p_portal:body.portal,p_identity:id,p_password:password,p_ciphertext:sealPortalPassword(`${body.portal}:${id}`,password),p_actor:auth.user.id,p_full_name:typeof body.fullName==='string'?body.fullName:null,p_create:body.create===true});
   if(error)return reply(400,{error:'Could not save password. Check the account details and database migration.'});
   return reply(200,{success:true,id:data});
  }
  if(body.action==='reveal'){
   const [current,copy]=await Promise.all([
    client.from('portal_password_current').select('password_hash').eq('portal',body.portal).eq('identity',id).maybeSingle(),
    client.from('portal_password_vault').select('ciphertext,password_hash').eq('portal',body.portal).eq('identity',id).maybeSingle(),
   ]);
   if(current.error||copy.error)throw new Error('Read failed');
   if(!current.data||!copy.data||current.data.password_hash!==copy.data.password_hash)return reply(409,{error:'This password was saved without a readable copy. Set a new password once to enable Show.'});
   try{return reply(200,{password:openPortalPassword(`${body.portal}:${id}`,copy.data.ciphertext)});}catch{return reply(409,{error:'The saved copy cannot be opened. Set a new password to enable Show again.'});}
  }
  return reply(400,{error:'Choose a valid action.'});
 }catch{return reply(500,{error:'Password access is unavailable. Check that the portal password migration has been applied.'});}
};
