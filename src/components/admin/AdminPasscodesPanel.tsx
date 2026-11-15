import {registrationBatches} from '../../utils/registrationBatches';
import {validPortalSecret,portalSecretHelp} from '../../../shared/portalCredentials';
import { useEffect, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { PortalPasswordReveal, portalPasswordRequest } from './PortalPasswordReveal';
import { supabase } from '../../lib/supabase';

export const AdminPasscodesPanel = ({ section='council', active=true }: { section?:'council'|'cr'; active?:boolean }) => {
  const { isOwner, siteSettings }=useData();
  const batchOptions=registrationBatches(siteSettings);
  const {getValidToken}=useAuth();
  const [showNew,setShowNew]=useState(false),[revision,setRevision]=useState(0);
  const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[batch,setBatch]=useState('');
  const [rows,setRows]=useState<{batch:string;updated_at:string}[]>([]),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false);
  const [notice,setNotice]=useState<{error:boolean;text:string}|null>(null);
  const load=async()=>{setLoading(true);try{const {data,error}=await supabase.from('batch_crs').select('batch,updated_at').order('batch');if(error)throw error;setRows(data||[]);}catch(error:any){setNotice({error:true,text:error.message||'Could not load CR accounts.'});}finally{setLoading(false);}};
  useEffect(()=>{if(section==='cr'&&isOwner())void load();},[section]);
  if(!isOwner())return <p>Only owners can manage portal credentials.</p>;
  const reset=()=>{setPassword('');setConfirm('');};
  return <div className="access-settings">
    {notice&&<p className={`access-notice is-${notice.error?'error':'success'}`} role={notice.error?'alert':'status'}>{notice.text}</p>}
    <section className="access-card"><h3>{section==='council'?'Council password':'Batch CR passwords'}</h3><p>{section==='council'?'Set the shared password used to sign in to the Council analytics portal.':'Choose the batch and set its CR portal password. Other batches are unaffected.'} Use a 4–8 digit PIN or a password with at least 8 characters. Use Show to view a saved code. Older passwords may need to be set once before they can be shown.</p>
      {section==='council'&&<PortalPasswordReveal portal="council" identity="1" active={active} revision={revision}/>}
      <form className="access-form" onSubmit={async event=>{event.preventDefault();if(busy)return;setNotice(null);if(!validPortalSecret(password)){setNotice({error:true,text:portalSecretHelp});return;}if(password!==confirm){setNotice({error:true,text:'Passwords do not match.'});return;}setBusy(true);try{await portalPasswordRequest(await getValidToken(),{action:'save',portal:section,id:section==='council'?'1':batch.trim(),password});setRevision(value=>value+1);if(section==='cr'){await load();setBatch('');}reset();setNotice({error:false,text:section==='council'?'Council password updated.':'CR password saved.'});}catch(error:any){setNotice({error:true,text:error.message||'Unable to save password.'});}finally{setBusy(false);}}}>
        {section==='cr'&&<label htmlFor="cr-batch-name">Batch<select id="cr-batch-name" value={batch} onChange={event=>setBatch(event.target.value)} required disabled={busy}><option value="" disabled>Choose registration batch</option>{batch&&!batchOptions.includes(batch)&&<option value={batch}>{batch}</option>}{batchOptions.map(value=><option key={value} value={value}>{value}</option>)}</select><small>Batches come from student registration settings. This CR can approve all students in that batch.</small></label>}
        <div className="access-fields"><label htmlFor={`${section}-password`}>New PIN / password<input id={`${section}-password`} type={showNew?'text':'password'} autoComplete="new-password" minLength={4} maxLength={128} required value={password} onChange={event=>setPassword(event.target.value)} disabled={busy}/></label><label htmlFor={`${section}-confirm`}>Confirm PIN / password<input id={`${section}-confirm`} type={showNew?'text':'password'} autoComplete="new-password" minLength={4} required value={confirm} onChange={event=>setConfirm(event.target.value)} disabled={busy}/></label></div>
        <button className="account-secondary" type="button" onClick={()=>setShowNew(value=>!value)}>{showNew?'Hide passwords':'Show passwords'}</button><button className="account-primary" disabled={busy||!password||!confirm}>{busy?'Saving…':section==='council'?'Save Council password':'Save CR password'}</button>
      </form>
    </section>
    {section==='cr'&&<section className="access-card"><div className="access-card-heading"><h3>Configured batches</h3><button className="account-secondary" onClick={()=>void load()} disabled={busy||loading}>Refresh</button></div>{loading?<p>Loading batches…</p>:!rows.length?<p>No CR accounts yet. Add a batch above.</p>:<div className="access-table-scroll"><table className="access-table"><thead><tr><th>Batch</th><th>Password</th><th>Actions</th></tr></thead><tbody>{rows.map(row=><tr key={row.batch}><td>{row.batch}</td><td><PortalPasswordReveal portal="cr" identity={row.batch} active={active} revision={revision}/></td><td><div className="access-row-actions"><button className="account-secondary" disabled={busy} onClick={()=>{setBatch(row.batch);reset();document.getElementById('cr-password')?.focus();}}>Change password</button><button className="account-secondary" disabled={busy} onClick={async()=>{if(!window.confirm(`Remove CR access for ${row.batch}?`))return;setBusy(true);setNotice(null);try{const {error}=await supabase.rpc('remove_cr_access',{p_batch:row.batch});if(error)throw error;await load();setNotice({error:false,text:`CR access removed for ${row.batch}.`});}catch(error:any){setNotice({error:true,text:error.message});}finally{setBusy(false);}}}>Remove access</button></div></td></tr>)}</tbody></table></div>}</section>}
  </div>;
};
