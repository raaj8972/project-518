import { SITE_FEATURES, isSportsSection } from '../../constants/siteFeatures';
import { ADMIN_PAGES } from '../../../shared/adminAccess';
export function pagesForPermissions(permissions: any): string[] {
  if (permissions?.page_access_configured) return permissions.allowed_pages || [];
  return ADMIN_PAGES.filter(page => page.flag && permissions?.[page.flag]).map(page => page.id);
}
export function AdminPageSelector({ pages, onChange, disabled=false }: {pages:string[];onChange:(pages:string[])=>void;disabled?:boolean}) {
  const selected = new Set(pages);
  const visiblePages = ADMIN_PAGES.filter(page => SITE_FEATURES.sports || !isSportsSection(page.id));
  return <div className="admin-page-selector"><div className="admin-page-selector-heading"><strong>Allowed management pages</strong><span>{visiblePages.filter(page => selected.has(page.id)).length} selected</span></div><p>Only checked pages will appear in this admin’s workspace. Account security is always available.</p>{[...new Set(visiblePages.map(page=>page.group))].map(group=><details key={group} open={group==='Festival'||group==='Participants'}><summary>{group}<span>{visiblePages.filter(page=>page.group===group&&selected.has(page.id)).length} selected</span></summary><div className="admin-page-options">{visiblePages.filter(page=>page.group===group).map(page=><label key={page.id}><input type="checkbox" checked={selected.has(page.id)} disabled={disabled} onChange={()=>onChange(selected.has(page.id)?pages.filter(id=>id!==page.id):[...pages,page.id])}/><span>{page.label}</span></label>)}</div></details>)}</div>;
}
