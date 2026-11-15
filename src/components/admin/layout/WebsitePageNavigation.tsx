import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, Globe } from 'lucide-react';
import { websitePageForSection, websitePageTools } from '../../../constants/websitePages';
import type { TabType } from './AdminLayout';
export function WebsitePageNavigation({activeTab,available}:{activeTab:TabType;available:ReadonlySet<string>}) {
  const location=useLocation();const page=websitePageForSection(activeTab);
  if(!page)return null;
  const tools=websitePageTools(page,available);
  const Heading=page.id === 'homepage' ? 'h2' : 'h1';
  const background=new URLSearchParams(location.search).get('edit')==='background';
  return <section className={`owner-website-page${page.id !== activeTab ? ' owner-website-page--nested' : ''}`} aria-label={`${page.name} page workspace`}>
    <div className="owner-website-page-heading"><div><span><Globe size={13}/>WEBSITE PAGE <code>{page.path}</code></span><Heading>{page.name}</Heading><p>{page.description}</p></div><a href={page.path} target="_blank" rel="noreferrer">View {page.name} page<ArrowUpRight size={15}/></a></div>
    {tools.length>1&&<nav className="owner-page-tools" aria-label={`${page.name} edit options`}>{tools.map(tool=>{
      const target=new URL(tool.href,'https://workspace.local');
      const selected=target.pathname===location.pathname && (target.search ? target.search===location.search : !background);
      return <Link key={tool.href} to={tool.href} aria-current={selected?'page':undefined}>{tool.label}</Link>;
    })}</nav>}
  </section>;
}
