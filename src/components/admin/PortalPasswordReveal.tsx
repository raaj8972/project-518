import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
export type PasswordPortal='council'|'cr'|'security';
export async function portalPasswordRequest(token:string|null,body:object){
 if(!token)throw new Error('Sign in again to manage passwords.');
 const response=await fetch('/api/portal-passwords',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body),cache:'no-store'});
 const data=await response.json();if(!response.ok)throw new Error(data.error||'Unable to access password.');return data;
}
export function PortalPasswordReveal({portal,identity,active=true,revision=0}:{portal:PasswordPortal;identity:string;active?:boolean;revision?:number}){
 const {getValidToken}=useAuth();
 const generation=useRef(0);
 const [password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{generation.current++;setPassword('');setError('');return()=>{generation.current++;};},[portal,identity,active,revision]);
 useEffect(()=>{if(!password)return;const timer=setTimeout(()=>setPassword(''),30000);return()=>clearTimeout(timer);},[password]);
 useEffect(()=>{const hide=()=>{generation.current++;setPassword('');};window.addEventListener('blur',hide);document.addEventListener('visibilitychange',hide);return()=>{window.removeEventListener('blur',hide);document.removeEventListener('visibilitychange',hide);};},[]);
 return <div className="portal-password-reveal"><div className="access-row-actions"><code>{password||'••••••••'}</code><button type="button" className="account-secondary" disabled={busy||!active} aria-label={`${password?'Hide':'Show'} ${portal} password for ${identity}`} onClick={async()=>{
  if(password){setPassword('');return;}const requestGeneration=++generation.current;setBusy(true);setError('');try{const data=await portalPasswordRequest(await getValidToken(),{action:'reveal',portal,id:identity});if(generation.current===requestGeneration&&document.visibilityState!=='hidden')setPassword(data.password);}catch(error:any){if(generation.current===requestGeneration)setError(error.message);}finally{setBusy(false);}
 }}>{password?<EyeOff size={14}/>:<Eye size={14}/>} {busy?'Loading…':password?'Hide':'Show'}</button></div>{error&&<small role="alert">{error}</small>}</div>;
}
