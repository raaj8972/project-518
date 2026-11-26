import { Link, useLocation } from 'react-router-dom';
import { ArrowTopRightIcon, CalendarIcon, CameraIcon, ClockIcon, GlobeIcon, HomeIcon, PersonIcon, SpeakerLoudIcon, StarIcon } from '@radix-ui/react-icons';
import { websitePageForSection, websitePageTools } from '../../../constants/websitePages';
import type { TabType } from './AdminLayout';
const pageIcons = { homepage: HomeIcon, events: CalendarIcon, schedule: ClockIcon, gallery: CameraIcon, homebound: SpeakerLoudIcon, 'rico-family': PersonIcon, sponsors: StarIcon };
export function WebsitePageNavigation({ activeTab, available }: { activeTab: TabType; available: ReadonlySet<string> }) {
  const location = useLocation();
  const page = websitePageForSection(activeTab);
  if (!page) return null;
  const tools = websitePageTools(page, available);
  const Heading = 'h1';
  const Icon = pageIcons[page.id as keyof typeof pageIcons] || GlobeIcon;
  return <section className={`owner-website-page${page.id !== activeTab ? ' owner-website-page--nested' : ''}${page.id === 'schedule' ? ' owner-website-page--schedule' : ''}${page.id === 'gallery' ? ' owner-website-page--gallery' : ''}${page.id === 'sponsors' ? ' owner-website-page--sponsors' : ''}`} aria-label={`${page.name} page workspace`}>
    <div className="owner-website-page-heading"><div className="admin-page-identity"><span className="admin-page-symbol"><Icon /></span><div><span>YOUR WEBSITE<code>{page.path}</code></span><Heading>{page.name}</Heading><p>{page.description}</p></div></div><a href={page.path} target="_blank" rel="noreferrer">View {page.name} page<ArrowTopRightIcon /></a></div>
    {tools.length > 1 && <nav className="owner-page-tools" aria-label={`${page.name} edit options`}>{tools.map(tool => {
      const target = new URL(tool.href, 'https://workspace.local');
      const selected = target.pathname === location.pathname && (target.search ? target.search === location.search : true);
      return <Link key={tool.href} to={tool.href} aria-current={selected ? 'page' : undefined}>{tool.label}</Link>;
    })}</nav>}
  </section>;
}
