import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

type Notice = { type:'success'|'error'; text:string } | null;
export const SecuritySettings = ({ section = 'account', active = true }: { section?:'account'|'sessions'; active?:boolean }) => {
  const { user, logout, getValidToken, isTOTPEnabled, setupTOTP, enableTOTP, disableTOTP } = useAuth();
  const { isOwner: checkIsOwner } = useData();
  const isOwner = checkIsOwner();
  const [password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[show,setShow]=useState(false);
  const [notice,setNotice]=useState<Notice>(null),[busy,setBusy]=useState(false);
  const [enrollment,setEnrollment]=useState<{secret:string;qrCode:string}|null>(null),[code,setCode]=useState('');
  const [users,setUsers]=useState<any[]>([]),[loadingUsers,setLoadingUsers]=useState(false);
  const tokenRef=useRef(getValidToken); tokenRef.current=getValidToken;
  const request=async(body:object)=>{
    const token=await tokenRef.current(); if(!token)throw new Error('Please sign in again.');
    const response=await fetch('/api/admin-security-controls',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body)});
    const data=await response.json(); if(!response.ok)throw new Error(data.error||'Unable to complete this action.');return data;
  };
  const loadUsers=async()=>{setLoadingUsers(true);try{setUsers(await request({action:'list_users'}));setNotice(previous=>previous?.type==='error'?null:previous);}catch(error:any){setNotice({type:'error',text:error.message});}finally{setLoadingUsers(false);}};
  useEffect(()=>{if(section==='sessions'&&isOwner&&active)void loadUsers();},[section,isOwner,active]);
  const run=async(action:()=>Promise<void>)=>{if(busy)return;setBusy(true);setNotice(null);try{await action();}catch(error:any){setNotice({type:'error',text:error.message||'Unable to complete this action.'});}finally{setBusy(false);}};
  const revoke=async(id:string,email:string)=>{
    if(!window.confirm(`Sign out all sessions for ${email}? They will need to sign in again.`))return;
    await run(async()=>{await request({action:'force_logout',targetUserId:id});if(id===user?.id)await logout();else{setNotice({type:'success',text:`Sessions signed out for ${email}.`});await loadUsers();}});
  };
  return <div className="access-settings">
    {notice&&<p className={`access-notice is-${notice.type}`} role={notice.type==='error'?'alert':'status'}>{notice.text}</p>}
    {section==='account'?<>
      <div className="access-account-id"><ShieldCheck size={20}/><div><strong>{user?.email}</strong><span>Your signed-in {isOwner?'owner':'admin'} account</span></div></div>
      <section className="access-card"><h3>Change my password</h3><p>Use at least 8 characters. After saving, sign in again with your new password.</p>
        <form className="access-form" onSubmit={event=>{event.preventDefault();if(password.length<8){setNotice({type:'error',text:'Use at least 8 characters.'});return;}if(password!==confirmation){setNotice({type:'error',text:'Passwords do not match.'});return;}void run(async()=>{const result=await request({action:'update_password',targetUserId:user?.id,newPassword:password});setPassword('');setConfirmation('');if(result.warning){setNotice({type:'error',text:result.warning});return;}await logout();});}}>
          <div className="access-fields">{[{id:'my-new-password',label:'New password',value:password,change:setPassword},{id:'my-confirm-password',label:'Confirm new password',value:confirmation,change:setConfirmation}].map(field=><label key={field.id} htmlFor={field.id}>{field.label}<input id={field.id} type={show?'text':'password'} autoComplete="new-password" minLength={8} required value={field.value} onChange={event=>field.change(event.target.value)} disabled={busy}/></label>)}</div>
          <div className="access-form-actions"><button type="button" className="account-secondary" onClick={()=>setShow(!show)}>{show?<EyeOff size={14}/>:<Eye size={14}/>} {show?'Hide passwords':'Show passwords'}</button><button type="submit" className="account-primary" disabled={busy||!password||!confirmation}>{busy?'Saving…':'Save password'}</button></div>
        </form><Link className="access-text-link" to="/forgot-password">Forgot your password? Recover with email verification</Link>
      </section>
      <section className="access-card"><div className="access-card-heading"><h3>Two-factor authentication</h3><span className={`access-status${isTOTPEnabled?' is-enabled':''}`}>{isTOTPEnabled?'Enabled':'Not enabled'}</span></div><p>Use an authenticator app for an additional code when you sign in.</p>
        {enrollment?<div className="access-enrollment"><img src={enrollment.qrCode} alt="Scan this QR code in your authenticator app" width={180} height={180}/><div><p>Scan the QR code with your authenticator app, then enter its 6-digit code.</p><details><summary>Can’t scan the code?</summary><code>{enrollment.secret}</code></details><form className="access-inline-form" onSubmit={event=>{event.preventDefault();void run(async()=>{if(!await enableTOTP(code,enrollment.secret))throw new Error('That code could not be verified. Try the latest code.');setEnrollment(null);setCode('');setNotice({type:'success',text:'Two-factor authentication enabled.'});});}}><label htmlFor="authenticator-code">Authenticator code<input id="authenticator-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" required value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,'').slice(0,6))}/></label><button className="account-primary" disabled={busy||code.length!==6}>Verify & enable</button><button type="button" className="account-secondary" onClick={()=>{setEnrollment(null);setCode('');}} disabled={busy}>Cancel</button></form></div></div>:isTOTPEnabled?<button className="account-secondary" disabled={busy} onClick={()=>{if(window.confirm('Turn off two-factor authentication for your account?'))void run(async()=>{if(!await disableTOTP())throw new Error('Could not disable two-factor authentication.');setNotice({type:'success',text:'Two-factor authentication disabled.'});});}}>Disable 2FA</button>:<button className="account-primary" disabled={busy} onClick={()=>void run(async()=>{const result=await setupTOTP();if(!result||'error'in result)throw new Error(result&&'error'in result?result.error:'Unable to start authenticator setup.');setEnrollment(result);})}>{busy?'Preparing…':'Set up authenticator'}</button>}
      </section>
    </>:<>
      <section className="access-card"><h3>My sessions</h3><p>Sign out your account on all devices. You will also be signed out here.</p><button className="account-secondary" disabled={busy} onClick={()=>void revoke(user!.id,user!.email!)}>Sign out all my devices</button></section>
      {isOwner&&<section className="access-card"><div className="access-card-heading"><div><h3>Team security</h3><p>Review authenticator status and revoke access on other devices.</p></div><button className="account-secondary" disabled={busy||loadingUsers} onClick={()=>void loadUsers()}>Refresh</button></div><div className="access-table-scroll"><table className="access-table"><thead><tr><th>Account</th><th>2FA</th><th>Last sign-in</th><th>Actions</th></tr></thead><tbody>{users.map(item=><tr key={item.id}><td><strong>{item.display_name||item.email}</strong>{item.display_name&&item.display_name!==item.email&&<small>{item.email}</small>}</td><td>{item.totp_enabled?'Enabled':'Not enabled'}</td><td>{item.last_sign_in_at?new Date(item.last_sign_in_at).toLocaleString():'Not recorded'}</td><td><div className="access-row-actions"><button className="account-secondary" disabled={busy} onClick={()=>void revoke(item.id,item.email)}>Sign out devices</button>{item.totp_enabled&&<button className="account-secondary" disabled={busy} onClick={()=>{if(window.confirm(`Disable 2FA for ${item.email}?`))void run(async()=>{await request({action:'toggle_2fa',targetUserId:item.id,enable:false});await loadUsers();setNotice({type:'success',text:`2FA disabled for ${item.email}.`});});}}>Reset 2FA</button>}</div></td></tr>)}</tbody></table>{loadingUsers?<p>Loading team accounts…</p>:!users.length&&<p>No team accounts to display.</p>}</div></section>}
    </>}
  </div>;
};
