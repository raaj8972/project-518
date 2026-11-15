import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useData } from '../../context/DataContext';
import { useEventsData } from '../../context/EventsContext';
import { AICoordinatorScanner } from './coordinator/AICoordinatorScanner';

type Extracted = {event_name:string;coordinator_name:string;password:string};
export function CoordinatorPasswordManagement({active=true}:{active?:boolean}){
  const {getValidToken}=useAuth();const tokenRef=useRef(getValidToken);tokenRef.current=getValidToken;
  const {events,refreshAll,isOwner}=useData();const {eventCoordinators}=useEventsData();
  const [passwords,setPasswords]=useState<Record<string,string>>({}),[grouping,setGrouping]=useState<Record<string,boolean>>({});
  const [query,setQuery]=useState(''),[category,setCategory]=useState(''),[show,setShow]=useState(false),[scanner,setScanner]=useState(false),[busy,setBusy]=useState(false);
  const [notice,setNotice]=useState<{error:boolean;text:string}|null>(null);
  const owner=isOwner();
  const [statuses,setStatuses]=useState<Record<string,{configured:boolean;canReveal:boolean}>>({});
  const [statusLoading,setStatusLoading]=useState(true),[statusError,setStatusError]=useState('');
  const [revealed,setRevealed]=useState<Record<string,string>>({}),[revealing,setRevealing]=useState('');
  const hideTimers=useRef(new Map<string,ReturnType<typeof setTimeout>>());
  const request=useCallback(async(body:object)=>{
    const token=await tokenRef.current();if(!token)throw new Error('Please sign in again.');
    const response=await fetch('/api/coordinator-passwords',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body)});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'Unable to complete the password request.');return result;
  },[]);
  const loadStatus=useCallback(async()=>{setStatusLoading(true);try{const result=await request({action:'status'});setStatuses(Object.fromEntries(result.statuses.map((item:any)=>[item.eventId,item])));setStatusError('');}catch(error:any){setStatusError(error.message||'Unable to load current password status.');}finally{setStatusLoading(false);}},[request]);
  const hide=(id:string)=>{const timer=hideTimers.current.get(id);if(timer)clearTimeout(timer);hideTimers.current.delete(id);setRevealed(previous=>{const next={...previous};delete next[id];return next;});};
  useEffect(()=>{if(owner&&active)void loadStatus();},[owner,active,loadStatus]);
  const visible=useRef(active);visible.current=active;
  const clearVisible=useCallback(()=>{hideTimers.current.forEach(clearTimeout);hideTimers.current.clear();setRevealed({});},[]);
  useEffect(()=>{if(!active)clearVisible();},[active,clearVisible]);
  useEffect(()=>{const hidden=()=>{if(document.hidden)clearVisible();};document.addEventListener('visibilitychange',hidden);return()=>{hideTimers.current.forEach(clearTimeout);document.removeEventListener('visibilitychange',hidden);};},[clearVisible]);
  const reveal=async(id:string)=>{
    if(revealed[id]){hide(id);return;}if(revealing)return;setRevealing(id);setNotice(null);
    try{const result=await request({action:'reveal',eventId:id});if(!visible.current||document.hidden)return;setRevealed(previous=>({...previous,[id]:result.password}));hideTimers.current.set(id,setTimeout(()=>hide(id),30000));}
    catch(error:any){setNotice({error:true,text:error.message||'Unable to show this password.'});void loadStatus();}finally{setRevealing('');}
  };
  const names=(id:string)=>eventCoordinators.filter(item=>String(item.event_id)===id).map(item=>item.name).join(', ');
  const categories=useMemo(()=>[...new Set(events.map(event=>event.category).filter(Boolean))],[events]);
  const filtered=events.filter(event=>(!category||event.category===category)&&`${event.title} ${names(String(event.id))}`.toLowerCase().includes(query.toLowerCase()));
  const changed=(event:any)=>Boolean(passwords[String(event.id)])||(grouping[String(event.id)]!==undefined&&grouping[String(event.id)]!==Boolean((event as any).special_grouping_enabled));
  const pending=events.filter(changed);
  if(!owner)return <p>Only owners can manage coordinator passwords.</p>;
  const save=async(ids:string[])=>{
    if(busy||!ids.length)return;setNotice(null);
    if(ids.some(id=>passwords[id]&&(passwords[id].length<8||passwords[id]!==passwords[id].trim()))){setNotice({error:true,text:'Use at least 8 characters without leading or trailing spaces for each new password.'});return;}
    setBusy(true);let saved=0;const failed:string[]=[];
    try{
      for(const id of ids){
        const payload:any={};if(passwords[id])payload.coordinator_password=passwords[id];if(grouping[id]!==undefined)payload.special_grouping_enabled=grouping[id];
        hide(id);
        try{if(passwords[id]){await request({action:'save',eventId:id,password:passwords[id],...(grouping[id]!==undefined?{grouping:grouping[id]}:{})});}else{const {error}=await supabase.from('events').update(payload).eq('id',id);if(error)throw error;}}catch{failed.push(events.find(event=>String(event.id)===id)?.title||id);continue;}
        saved++;setPasswords(previous=>{const next={...previous};delete next[id];return next;});setGrouping(previous=>{const next={...previous};delete next[id];return next;});
      }
      await refreshAll();await loadStatus();
      setNotice({error:failed.length>0,text:failed.length?`${saved} saved. Could not save: ${failed.join(', ')}. Unsaved changes are kept for retry.`:`Access updated for ${saved} event${saved===1?'':'s'}. Changed passwords take effect immediately.`});
    }catch{setNotice({error:true,text:'The updates could not finish. Refresh the event list and retry any remaining changes.'});}finally{setBusy(false);}
  };
  const scanned=(data:Extracted[])=>{
    const normalize=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]/g,'');
    setPasswords(previous=>{const next={...previous};for(const item of data){if(!item.event_name||!item.password||item.password==='TBA')continue;const term=normalize(item.event_name);if(!term)continue;const matches=events.filter(event=>{const title=normalize(event.title);return title&&(title.includes(term)||term.includes(title));});if(matches.length===1){next[String(matches[0].id)]=item.password;}}return next;});
    setScanner(false);setNotice({error:false,text:`Imported passwords are staged for review. Save them below to apply changes.`});
  };
  return <div className="access-settings">
    {statusError&&<p className="access-notice is-error" role="alert">{statusError} <button className="account-secondary" onClick={()=>void loadStatus()}>Retry password status</button></p>}
    {notice&&<p className={`access-notice is-${notice.error?'error':'success'}`} role={notice.error?'alert':'status'}>{notice.text}</p>}
    <section className="access-card"><div className="access-card-heading"><div><h3>Event coordinator passwords</h3><p>View the current password with Show. Passwords hide automatically after 30 seconds. If a saved copy is unavailable, set a new password once to enable Show.</p></div><div className="access-row-actions"><button className="account-secondary" disabled={busy} onClick={()=>setScanner(true)}>Import from image</button><button className="account-primary" disabled={busy||!pending.length} onClick={()=>void save(pending.map(event=>String(event.id)))}>{busy?'Saving…':`Save changes${pending.length?` (${pending.length})`:''}`}</button></div></div>
      {scanner&&<AICoordinatorScanner onScanComplete={scanned} onCancel={()=>setScanner(false)}/>}
      <div className="access-coordinator-filters"><label>Find an event or coordinator<input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search events or names"/></label><label>Category<select value={category} onChange={event=>setCategory(event.target.value)}><option value="">All categories</option>{categories.map(value=><option key={value} value={value}>{value}</option>)}</select></label><button className="account-secondary" onClick={()=>setShow(!show)}>{show?'Hide new passwords':'Show new passwords'}</button></div>
      {!filtered.length?<p>No events match your search.</p>:<div className="access-table-scroll"><table className="access-table access-coordinator-table"><thead><tr><th>Event & coordinator</th><th>Current password</th><th>New password</th><th>Team grouping</th><th>Action</th></tr></thead><tbody>{filtered.map(event=>{const id=String(event.id);return <tr key={id}><td><strong>{event.title}</strong><small>{names(id)||'No coordinator assigned'}</small></td><td><div className="access-current-password">{statusLoading?<small>Checking…</small>:statuses[id]?.canReveal?<><code>{revealed[id]||'••••••••'}</code><button className="account-secondary" disabled={Boolean(revealing)||busy} aria-label={`${revealed[id]?'Hide':'Show'} current password for ${event.title}`} onClick={()=>void reveal(id)}>{revealing===id?'Opening…':revealed[id]?'Hide':'Show'}</button></>:<small>{statuses[id]?.configured?'Current password unavailable. Set a new one to enable Show.':statusError?'Status unavailable':'Not configured'}</small>}</div></td><td><input aria-label={`New coordinator password for ${event.title}`} type={show?'text':'password'} autoComplete="new-password" minLength={8} value={passwords[id]||''} onChange={change=>setPasswords(previous=>({...previous,[id]:change.target.value}))} disabled={busy} placeholder="Leave blank to keep unchanged"/></td><td><label className="access-grouping"><input type="checkbox" checked={grouping[id]??Boolean((event as any).special_grouping_enabled)} onChange={change=>setGrouping(previous=>({...previous,[id]:change.target.checked}))} disabled={busy}/><span>Allow grouping</span></label></td><td><button className="account-secondary" disabled={busy||!changed(event)} onClick={()=>void save([id])}>Save</button></td></tr>;})}</tbody></table></div>}
    </section>
  </div>;
}
