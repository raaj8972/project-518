import type { Handler } from '@netlify/functions';
import { getSupabaseClient } from './lib/supabase';
import { verifyAdmin } from './lib/auth-verify';
import { openCoordinatorPassword, sealCoordinatorPassword } from './lib/coordinator-password-vault';

export const handler:Handler=async event=>{
  const reply=(statusCode:number,data:object)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store, private','Pragma':'no-cache'},body:JSON.stringify(data)});
  if(event.httpMethod!=='POST')return reply(405,{error:'Method not allowed.'});
  try{
    const client=getSupabaseClient(true),auth=await verifyAdmin(event.headers.authorization||event.headers.Authorization,client);
    if(!auth.user||!auth.isOwner)return reply(403,{error:'Only owners can view or change coordinator passwords.'});
    let body:any;try{body=JSON.parse(event.body||'{}');}catch{return reply(400,{error:'Invalid request.'});}
    if(body.action==='status'){
      const [credentials,vault]=await Promise.all([client.from('coordinator_credentials').select('event_id,password_hash'),client.from('coordinator_password_vault').select('event_id,password_hash')]);
      if(credentials.error||vault.error)throw new Error('Unable to load password status.');
      const snapshots=new Map((vault.data||[]).map(row=>[row.event_id,row.password_hash]));
      return reply(200,{statuses:(credentials.data||[]).map(row=>({eventId:row.event_id,configured:true,canReveal:snapshots.get(row.event_id)===row.password_hash}))});
    }
    const eventId=body.eventId;
    if(typeof eventId!=='string'||!eventId||eventId.length>200)return reply(400,{error:'Choose an event.'});
    if(body.action==='reveal'){
      const [credential,copy]=await Promise.all([client.from('coordinator_credentials').select('password_hash').eq('event_id',eventId).maybeSingle(),client.from('coordinator_password_vault').select('ciphertext,password_hash').eq('event_id',eventId).maybeSingle()]);
      if(credential.error||copy.error)throw new Error('Unable to load the saved password.');
      if(!credential.data||!copy.data||copy.data.password_hash!==credential.data.password_hash)return reply(409,{error:'This current password is not available to show. Set a new password once to enable Show.'});
      let password:string;try{password=openCoordinatorPassword(eventId,copy.data.ciphertext);}catch{return reply(409,{error:'The saved copy cannot be opened. Set a new password to enable Show again.'});}
      return reply(200,{eventId,password});
    }
    if(body.action==='save'){
      const password=body.password;
      if(typeof password!=='string'||password.length<8||Buffer.byteLength(password)>72||password!==password.trim())return reply(400,{error:'Use at least 8 characters without leading or trailing spaces. Very long passwords are not supported.'});
      if(body.grouping!==undefined&&typeof body.grouping!=='boolean')return reply(400,{error:'Choose a valid grouping setting.'});
      const ciphertext=sealCoordinatorPassword(eventId,password);
      const {error}=await client.rpc('save_coordinator_password_copy',{p_event_id:eventId,p_password:password,p_ciphertext:ciphertext,p_actor:auth.user.id,p_grouping:body.grouping??null});
      if(error)throw new Error('Unable to save this coordinator password.');
      return reply(200,{success:true,eventId,configured:true,canReveal:true});
    }
    return reply(400,{error:'Choose a valid action.'});
  }catch{return reply(500,{error:'Unable to complete the password request. Please try again.'});}
};
