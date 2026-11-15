import { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Crown, KeyRound, Layers3, ShieldCheck, Smartphone, Users, UserRoundCog, Monitor } from 'lucide-react';
import { useData } from '../../context/DataContext';
import '../../styles/PasswordsAccess.css';
import '../../styles/AdminAccounts.css';
const MySecurity=lazy(()=>import('./SecuritySettings').then(module=>({default:module.SecuritySettings})));
const Team=lazy(()=>import('./AdminUsersPanel').then(module=>({default:module.AdminUsersPanel})));
const Portals=lazy(()=>import('./AdminPasscodesPanel').then(module=>({default:module.AdminPasscodesPanel})));
const Coordinators=lazy(()=>import('./CoordinatorPasswordManagement').then(module=>({default:module.CoordinatorPasswordManagement})));
const SecurityStaff=lazy(()=>import('./SecurityStaffAccess').then(module=>({default:module.SecurityStaffAccess})));
const sections=[
  {id:'account',title:'My account & 2FA',description:'Your password, email recovery and authenticator app',icon:Smartphone,owner:false},
  {id:'team',title:'Owner & admin accounts',description:'Invite team members, assign pages and send password resets',icon:Users,owner:true},
  {id:'council',title:'Council access',description:'Password for the Council analytics portal',icon:Crown,owner:true},
  {id:'cr',title:'CR portal access',description:'Batch-wise Class Representative passwords',icon:Layers3,owner:true},
  {id:'coordinators',title:'Coordinator access',description:'Event-wise coordinator login passwords',icon:UserRoundCog,owner:true},
  {id:'staff',title:'Security staff accounts',description:'Security Node usernames, passwords and account access',icon:ShieldCheck,owner:true},
  {id:'sessions',title:'Sessions & devices',description:'Sign out devices and review your team’s 2FA status',icon:Monitor,owner:false},
];
export function PasswordsAccessCenter(){
  const {isOwner}=useData();const owner=isOwner();const location=useLocation();const navigate=useNavigate();
  const requested=new URLSearchParams(location.search).get('section');
  const active=sections.some(section=>section.id===requested&&(!section.owner||owner))?requested!:'';
  const [visited,setVisited]=useState(()=>new Set(active?[active]:[]));
  useEffect(()=>{if(active)setVisited(previous=>new Set([...previous,active]));},[active]);
  const open=(id:string)=>navigate({pathname:'/admin/security',search:id?`?section=${id}`:''},{replace:true});
  return <div className="passwords-access">
    <div className="access-intro"><span><KeyRound size={18}/></span><div><p>All account passwords and portal access, in one place.</p><small>Open a section below to manage it. Changes apply only to the account or portal you select.</small></div></div>
    <div className="access-sections">{sections.filter(section=>!section.owner||owner).map(section=>{
      const expanded=active===section.id;const loaded=visited.has(section.id)||expanded;
      return <section className={`access-section${expanded?' is-open':''}`} key={section.id}>
        <h2><button type="button" id={`access-heading-${section.id}`} aria-expanded={expanded} aria-controls={`access-panel-${section.id}`} onClick={()=>open(expanded?'':section.id)}><span className="access-section-icon"><section.icon size={20}/></span><span><strong>{section.title}</strong><small>{section.description}</small></span>{section.owner&&<span className="access-owner-badge">Owner only</span>}<ChevronDown size={17} className="access-chevron"/></button></h2>
        <div id={`access-panel-${section.id}`} role="region" aria-labelledby={`access-heading-${section.id}`} hidden={!expanded} className="access-section-content"><Suspense fallback={<p className="access-loading">Loading {section.title.toLowerCase()}…</p>}>{loaded&&<>
          {section.id==='account'&&<MySecurity section="account"/>}
          {section.id==='team'&&<Team onManage2FA={()=>open('sessions')}/>}
          {section.id==='council'&&<Portals section="council" active={expanded}/>}
          {section.id==='cr'&&<Portals section="cr" active={expanded}/>}
          {section.id==='coordinators'&&<Coordinators active={expanded}/>}
          {section.id==='staff'&&<SecurityStaff active={expanded}/>}
          {section.id==='sessions'&&<MySecurity section="sessions" active={expanded}/>}
        </>}</Suspense></div>
      </section>;
    })}</div>
  </div>;
}
