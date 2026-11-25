import { resolveHomepageMedia } from '../../../utils/homepageMedia';
import type { SocialDraft } from './HomepageSocialEditor';
import { DEFAULT_ROADMAP,isHomepageRoadmapVisible,type RoadmapItemDraft } from '../../../utils/homepageRoadmap';
import type { Event, Sponsor } from '../../../types/data';
import { resolveHomepagePartners } from '../../../utils/homepageContent';
import type { AboutDraft } from './HomepageAboutEditor';
import type { LeadDraft } from './LeadEditor';
import { memo, useEffect, useState, type CSSProperties } from 'react';
import { ArrowTopRightIcon, ChevronRightIcon, DesktopIcon, GlobeIcon, MobileIcon, PlayIcon } from '@radix-ui/react-icons';
import { heroMediaService, type HeroMediaV2 } from '../../../services/heroMediaService';
import type { HomepageDraft, HomepageSection } from './homepageForm';

interface PreviewPerson { id?: number | string; name?: string; full_name?: string; photo_url?: string | null; image_url?: string | null; image?: string | null; enabled?: boolean; }
interface Props {
  form: HomepageDraft;
  activeSection: HomepageSection;
  onSelectSection: (section: HomepageSection) => void;
  faculty?: PreviewPerson[];
  heads?: PreviewPerson[];
  sponsors?: Sponsor[];
  mediaOverride?: HeroMediaV2 | null;
  mediaPending?: boolean;
  about?: AboutDraft | null;
  featuredEvents?: Event[];
  leadOverrides?: LeadDraft[];
  social?:SocialDraft|null;
  roadmapItems?:RoadmapItemDraft[];
  dirty: boolean;
}
function HomepagePreviewView({ form, activeSection, onSelectSection, faculty = [], heads = [], sponsors = [], dirty, mediaOverride, mediaPending = false, about, featuredEvents = [], leadOverrides = [],social,roadmapItems = [] }: Props) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [loadedMedia, setMedia] = useState<HeroMediaV2 | null>(null);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    if (mediaOverride !== undefined) return;
    let cancelled = false;
    heroMediaService.getHeroMedia('home', { strict: true }).then(value => { if (!cancelled) setMedia(value); }).catch(() => { if (!cancelled) setMediaError(true); }).finally(() => { if (!cancelled) setMediaLoading(false); });
    return () => { cancelled = true; };
  }, [mediaOverride]);
  const media = mediaOverride === undefined ? loadedMedia : mediaOverride;
  const mobile = device === 'mobile';
  const background = resolveHomepageMedia(media, mobile);
  const image = background.kind === 'image' ? background.src : background.poster;
  useEffect(() => setImageFailed(false), [image]);
  const video = background.kind === 'video' ? background.src : '';
  const [videoFailed, setVideoFailed] = useState(false);
  useEffect(() => setVideoFailed(false), [video]);
  const mergeLeads = (source: PreviewPerson[], facultyGroup: boolean): PreviewPerson[] => [...source.map(person => ({ ...person, ...leadOverrides.find(lead => lead.id === person.id && (lead.kind === 'faculty') === facultyGroup) })), ...leadOverrides.filter(lead => lead.id == null && (lead.kind === 'faculty') === facultyGroup)];
  const displayedPeople = [...(form.show_faculty_heads ? mergeLeads(faculty,true) : []), ...(form.show_committee_heads ? mergeLeads(heads,false) : [])].filter(person => person.enabled !== false).slice(0,3);
  const partnerSelection = resolveHomepagePartners(sponsors,form.sponsor_logos,{featuredOnly:true,currentYear:Number(form.brand_year) || undefined});
  const featured = partnerSelection.partners.slice(0,4);
  const visibleRoadmap=roadmapItems.length ? roadmapItems.filter(item=>item.enabled) : DEFAULT_ROADMAP;
  const logoOffsetX = mobile ? form.brand_logo_offset_x_sm_px : form.brand_logo_offset_x_lg_px;
  const logoOffsetY = mobile ? form.brand_logo_offset_y_sm_px : form.brand_logo_offset_y_lg_px;
  const logoStyle: CSSProperties = { filter: Number(form.brand_logo_glow_strength) > 0 ? `drop-shadow(0 0 ${Number(form.brand_logo_glow_strength) * 3}px ${form.brand_logo_glow_color || '#ff00ff'})` : 'none', width: `${Math.min(100, Math.max(16, Number(form.brand_logo_size_px || 36) * .65))}px`, transform: `translate(${Number(logoOffsetX === '' || logoOffsetX == null ? form.brand_logo_offset_x_px || 0 : logoOffsetX) * .5}px, ${Number(logoOffsetY === '' || logoOffsetY == null ? form.brand_logo_offset_y_px || 0 : logoOffsetY) * .5}px)` };
  return <aside className="studio-preview" aria-label="Homepage draft preview">
    <div className="studio-preview-toolbar"><span><span className="studio-live-dot" />Live preview</span><div className="studio-device-controls" role="group" aria-label="Preview device"><button type="button" aria-label="Desktop preview" aria-pressed={!mobile} onClick={() => setDevice('desktop')}><DesktopIcon /></button><button type="button" aria-label="Mobile preview" aria-pressed={mobile} onClick={() => setDevice('mobile')}><MobileIcon /></button></div></div>
    <div className="studio-preview-stage">
      <div className={`studio-browser${mobile ? ' is-mobile' : ''}`} data-device={device}>
        <div className="studio-browser-chrome"><div aria-hidden="true"><i /><i /><i /></div><span><GlobeIcon />Homepage</span><ArrowTopRightIcon /></div>
        <div className="studio-preview-scroll">
          <div className="studio-site-nav"><button type="button" aria-label="Edit brand identity" onClick={() => onSelectSection('branding')} className={`studio-preview-brand${form.brand_logo_side === 'right' ? ' logo-right' : ''}`}>
            {form.brand_logo_url && <img src={form.brand_logo_url} alt="Brand logo" style={logoStyle} />}<strong>{form.hero_title || 'Festival name'}<small>{form.brand_year}</small></strong>
          </button>{!mobile && <span>Events<span>Schedule</span>Gallery<ArrowTopRightIcon /></span>}</div>
          <div className={`studio-preview-hero${activeSection === 'content' ? ' is-selected' : ''}`}>
            {media?.enabled !== false && video && !videoFailed ? <video className="studio-preview-backdrop" src={video} poster={image} muted autoPlay loop playsInline preload="metadata" onError={() => setVideoFailed(true)} /> : !imageFailed && media?.enabled !== false && <img className="studio-preview-backdrop" src={image} alt="" onError={() => setImageFailed(true)} />}
            <div className="studio-preview-scrim" style={media?.overlay_color ? {background:media.overlay_color,opacity:media.overlay_opacity} : undefined} />
            <button type="button" className="studio-preview-copy" aria-label="Edit homepage hero text" onClick={() => onSelectSection('content')}>
              <span className="studio-preview-eyebrow">IQ CITY · ANNUAL FESTIVAL</span><strong data-preview="title">{form.hero_title || 'Your festival name'}</strong><span className="studio-preview-tagline">{form.hero_subtitle || 'Your festival tagline'}</span><span className="studio-preview-intro">{form.hero_description || 'Introduce your festival to visitors.'}</span><span className="studio-preview-cta">Explore events<ArrowTopRightIcon /></span>
              <span className="studio-preview-edition">{form.brand_year} edition<span>Culture. Competition. Community.</span></span>
            </button>
            {(mediaOverride === undefined ? mediaLoading : mediaPending) && <span className="studio-preview-loading" role="status">Loading background…</span>}
          </div>
          {activeSection === 'films' && <section className="studio-preview-films">{(['trailer', 'aftermovie'] as const).map(kind => <button key={kind} type="button" onClick={() => onSelectSection('films')} className={form[`instagram_${kind}_enabled`] ? '' : 'is-off'}><span><PlayIcon /></span><strong>{form[`instagram_${kind}_title`] || kind}<small>{form[`instagram_${kind}_enabled`] ? form[`instagram_${kind}_url`] ? form[`instagram_${kind}_subtitle`] : 'Add a reel link to show this film' : 'Hidden on the homepage'}</small></strong></button>)}</section>}
          {!!featuredEvents.length && <button type="button" className={`studio-preview-partners${activeSection === 'automatic' ? ' is-selected' : ''}`} onClick={() => onSelectSection('automatic')}><span className="studio-preview-section-label">Featured events · automatic<ChevronRightIcon /></span><span className="studio-preview-person-list">{featuredEvents.slice(0,2).map(event => <span key={event.id}>{event.image && <img src={event.image} alt="" />}<strong>{event.title}</strong></span>)}</span></button>}
          {(form.show_faculty_heads || form.show_committee_heads) && <button type="button" className={`studio-preview-people${activeSection === 'people' ? ' is-selected' : ''}`} onClick={() => onSelectSection('people')}><span className="studio-preview-section-label">The people behind the festival<ChevronRightIcon /></span>{displayedPeople.length ? <span className="studio-preview-person-list">{displayedPeople.map((person, index) => <span key={person.id ?? index}>{person.image || person.photo_url || person.image_url ? <img src={person.image || person.photo_url || person.image_url || ''} alt="" /> : <span className="studio-person-initial">{(person.name || person.full_name || 'Team').charAt(0)}</span>}<strong>{person.name || person.full_name || 'Team profile'}</strong></span>)}</span> : <span className="studio-preview-empty">Add leadership profiles in People & teams.</span>}</button>}
          {form.featured_partners_enabled && <button type="button" data-preview-section="partners" className={`studio-preview-partners${activeSection === 'partners' ? ' is-selected' : ''}`} onClick={() => onSelectSection('partners')}><span className="studio-preview-section-label">{partnerSelection.period === 'previous' ? 'Previous partners' : form.sponsor_section_title || 'Our partners'}<ChevronRightIcon /></span><span className="studio-preview-partner-description">{form.sponsor_section_subtitle}</span>{featured.length ? <span className="studio-preview-logo-list">{featured.map((sponsor, index) => <span key={sponsor.id ?? index}>{sponsor.logo ? <img src={sponsor.logo} alt={sponsor.name || 'Partner'} /> : sponsor.name}</span>)}</span> : <span className="studio-preview-empty">Mark sponsors as featured to show their logos here.</span>}</button>}
          {about?.enabled && <button type="button" className={`studio-preview-partners${activeSection === 'about' ? ' is-selected' : ''}`} onClick={() => onSelectSection('about')}><span className="studio-preview-section-label">{about.hero_title || 'About the festival'}<ChevronRightIcon /></span><strong className="studio-preview-about-heading">{about.hero_heading}</strong><span className="studio-preview-empty">{(about.hero_paragraphs[0] || '').replace(/<[^>]+>/g,'')}</span></button>}
          {isHomepageRoadmapVisible(form.roadmap_enabled)&&!!visibleRoadmap.length&&<button type="button" data-preview-section="roadmap" className={`studio-preview-roadmap${activeSection==='roadmap'?' is-selected':''}`} onClick={()=>onSelectSection('roadmap')}><span className="studio-preview-section-label">Ricorrenza Chronicles<ChevronRightIcon/></span><span className="studio-mini-road">{visibleRoadmap.map((item,index)=><span key={index}>{item.images[0]&&<img className="studio-mini-road-photo" src={item.images[0]} alt={`${item.year} cover`}/>}<i/><strong>{item.year}</strong><small>{item.title||item.points[0]}</small>{item.images.length>0&&<small>{item.images.length} photos · Auto slideshow</small>}</span>)}</span></button>}
          {((social?.instagram_enabled&&social.instagram_url)||(social?.youtube_enabled&&social.youtube_url)||activeSection==='social')&&<button type="button" data-preview-section="social" className="studio-preview-social" onClick={()=>onSelectSection('social')}><span>Follow the festival</span><span>{social?.instagram_enabled&&social.instagram_url&&<strong>Instagram</strong>}{social?.youtube_enabled&&social.youtube_url&&<strong>YouTube</strong>}{!social?.instagram_url&&!social?.youtube_url&&<small>Add your social links</small>}</span></button>}
        </div>
      </div>
    </div>
    <div className="studio-preview-caption"><span>{dirty ? 'Draft changes' : 'Saved content'}<span> · </span>{mobile ? 'Mobile' : 'Desktop'}</span><span>Click a section to edit</span></div>
    <p className="studio-preview-footnote">Layout preview. {mediaError ? 'Background could not load; a local preview is shown. ' : ''}Open the website to see its full animation and layout.</p>
  </aside>;
}
export const HomepagePreview = memo(HomepagePreviewView);
