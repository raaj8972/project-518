import {validPortalSecret,portalSecretHelp} from '../../../shared/portalCredentials';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { PortalPasswordReveal, portalPasswordRequest } from './PortalPasswordReveal';
export function SecurityStaffAccess({active=true}:{active?:boolean}){
  const { isOwner }=useData();
  const {getValidToken}=useAuth();
  const [showNew,setShowNew]=useState(false),[revision,setRevision]=useState(0);
  const [rows,setRows]=useState<any[]>([]),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
  const [form,setForm]=useState({name:'',password:'',confirm:''}),[editing,setEditing]=useState<any>(null),[open,setOpen]=useState(false);
  const [notice,setNotice]=useState<{error:boolean;text:string}|null>(null);
  const load=async()=>{setLoading(true);try{const {data,error}=await supabase.from('security_users').select('id,username,full_name,is_active').order('created_at',{ascending:false});if(error)throw error;setRows(data||[]);}catch(error:any){setNotice({error:true,text:error.message});}finally{setLoading(false);}};
  useEffect(()=>{if(isOwner())void load();},[]);
  if(!isOwner())return <p>Only owners can manage security staff.</p>;
  const clear=()=>{setEditing(null);setOpen(false);setForm({name:'',password:'',confirm:''});};
  return <div className="access-settings">{notice&&<p className={`access-notice is-${notice.error?'error':'success'}`} role={notice.error?'alert':'status'}>{notice.text}</p>}
    <section className="access-card"><div className="access-card-heading"><div><h3>Security staff accounts</h3><p>Add a staff name and a 4–8 digit PIN or password (at least 8 characters). Staff select their name to sign in. No email required.</p></div><button className="account-primary" disabled={busy} onClick={()=>{clear();setOpen(true);}}>Add security staff</button></div>
      {open&&<form className="access-form access-staff-form" onSubmit={async event=>{event.preventDefault();if(busy)return;setNotice(null);if(!validPortalSecret(form.password)||form.password!==form.confirm){setNotice({error:true,text:!validPortalSecret(form.password)?portalSecretHelp:'Passwords do not match.'});return;}setBusy(true);try{await portalPasswordRequest(await getValidToken(),{action:'save',portal:'security',id:editing?editing.username:`staff-${crypto.randomUUID()}`,password:form.password,fullName:form.name.trim(),create:!editing});setRevision(value=>value+1);setNotice({error:false,text:editing?'Password updated. Existing sessions have been signed out.':'Security staff account created.'});clear();await load();}catch(error:any){setNotice({error:true,text:error.message});}finally{setBusy(false);}}}>
        <h4>{editing?`Change PIN/password for ${editing.full_name}`:'New security staff account'}</h4>
        {!editing&&<div className="access-fields">{[{key:'name',label:'Staff name'}].map(field=><label key={field.key}>{field.label}<input value={form[field.key as 'name']} onChange={event=>setForm({...form,[field.key]:event.target.value})} autoComplete="off" required disabled={busy}/></label>)}</div>}
        <div className="access-fields">{[{key:'password',label:'PIN / password'},{key:'confirm',label:'Confirm PIN / password'}].map(field=><label key={field.key}>{field.label}<input type={showNew?'text':'password'} minLength={4} maxLength={128} autoComplete="new-password" value={form[field.key as 'password'|'confirm']} onChange={event=>setForm({...form,[field.key]:event.target.value})} required disabled={busy}/></label>)}</div>
        <div className="access-form-actions"><button className="account-secondary" type="button" onClick={()=>setShowNew(value=>!value)}>{showNew?'Hide passwords':'Show passwords'}</button><button className="account-secondary" type="button" disabled={busy} onClick={clear}>Cancel</button><button className="account-primary" disabled={busy}>{busy?'Saving…':editing?'Save password':'Create account'}</button></div>
      </form>}
      {loading?<p>Loading staff accounts…</p>:!rows.length?<p>No security staff accounts yet.</p>:<div className="access-table-scroll"><table className="access-table"><thead><tr><th>Staff member</th><th>Password</th><th>Access</th><th>Actions</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td><strong>{row.full_name}</strong></td><td><PortalPasswordReveal portal="security" identity={row.username} active={active} revision={revision}/></td><td>{row.is_active?'Active':'Disabled'}</td><td><div className="access-row-actions"><button className="account-secondary" disabled={busy} onClick={()=>{setEditing(row);setForm({name:'',password:'',confirm:''});setOpen(true);}}>Change password</button><button className="account-secondary" disabled={busy} onClick={async()=>{const action=row.is_active?'disable':'enable';if(!window.confirm(`${row.is_active?'Disable':'Enable'} access for ${row.full_name}?`))return;setBusy(true);setNotice(null);try{const {error}=await supabase.rpc('manage_security_user_access',{p_user_id:row.id,p_action:action});if(error)throw error;await load();setNotice({error:false,text:row.is_active?'Access disabled and sessions signed out.':'Access enabled.'});}catch(error:any){setNotice({error:true,text:error.message});}finally{setBusy(false);}}}>{row.is_active?'Disable access':'Enable access'}</button></div></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
