import { instagramProfile, personInstagram, facebookProfile, personBatch, phoneProfile } from '../../utils/familyPeople';
import { HomepageSocialEditor, makeSocialDraft, socialDraftError } from './homepage/HomepageSocialEditor';
import { HomepageRoadmapEditor } from './homepage/HomepageRoadmapEditor';
import { mergeRoadmapDrafts, normalizeRoadmapEdits, type RoadmapEdits } from '../../utils/homepageRoadmap';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type SetStateAction } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowTopRightIcon, CheckCircledIcon, ChevronRightIcon, Cross2Icon, ExclamationTriangleIcon, GlobeIcon, ImageIcon, LayersIcon, MixIcon, Pencil2Icon, ReloadIcon, ResetIcon, VideoIcon } from '@radix-ui/react-icons';
import { useData } from '../../context/DataContext';
import { useSavingProgress } from '../../context/SavingProgressContext';
import { HeroContentSettings } from './homepage/HeroContentSettings';
import { BrandingSettings } from './homepage/BrandingSettings';
import { PartnersSectionSettings } from './homepage/PartnersSectionSettings';
import { InstagramIntegrationSettings } from './homepage/InstagramIntegrationSettings';
import { LeadershipSettings } from './homepage/LeadershipSettings';
import { useStudioDraft } from '../../hooks/useStudioDraft';
import { useHomepageEvents } from '../../hooks/useHomepageEvents';
import { heroMediaService, normalizeHeroMedia, type HeroMediaV2 } from '../../services/heroMediaService';
import { HomepageMediaEditor } from './homepage/HomepageMediaEditor';
import { HomepageAboutEditor, makeAboutDraft, normalizeAboutDraft } from './homepage/HomepageAboutEditor';
import { HomepageAutomation } from './homepage/HomepageAutomation';
import { LeadEditor, normalizeLeadEdits, type LeadDraft, type LeadEdits } from './homepage/LeadEditor';
import { HomepagePreview } from './homepage/HomepagePreview';
import { hasHomepageChanges, makeHomepageDraft, normalizeHomepageDraft, serializeHomepageDraft, type HomepageDraft, type HomepageSection } from './homepage/homepageForm';
import '../../styles/HomepageStudio.css';

const EMPTY_ROADMAP_EDITS: RoadmapEdits = {};
const EMPTY_LEAD_EDITS: LeadEdits = {};
const DRAFT_KEY = 'admin_homepage_form_draft';
const sections = [
  { id: 'media', label: 'Background video & images', short: 'Background', description: 'Separate media for every screen.', detail: 'Replace the homepage background. Upload separate laptop and mobile assets, then save to publish.', icon: VideoIcon, fields: ['__hero_media'] },
  { id: 'content', label: 'Page content', short: 'Content', description: 'The words that welcome everyone in.', detail: 'Set your festival title, tagline and introduction. See every change in the preview.', icon: Pencil2Icon, fields: ['hero_title', 'hero_subtitle', 'hero_description'] },
  { id: 'branding', label: 'Brand identity', short: 'Branding', description: 'Make the festival unmistakably yours.', detail: 'Update the edition, upload your logo and fine-tune how it appears.', icon: ImageIcon, fields: ['brand_'] },
  { id: 'automatic', label: 'Automatic homepage sections', short: 'Auto sections', description: 'Live selections, no manual curation.', detail: 'Featured events follow the day and registration totals. Rico Stars follows live participant rankings.', icon: ReloadIcon, fields: ['__automatic'] },
  { id: 'about', label: 'About the festival', short: 'About', description: 'Your festival story.', detail: 'Edit your homepage About section, tracks, zones and verified statistics.', icon: Pencil2Icon, fields: ['__about'] },
  { id: 'social', label: 'Social media links', short: 'Social', description: 'Website social links.', detail: 'Manage Instagram and YouTube links and visibility without leaving Homepage Studio.', icon: GlobeIcon, fields: ['__social'] },
  { id: 'roadmap', label: 'Roadmap & milestones', short: 'Roadmap', description: 'Your festival journey.', detail: 'Edit the years, milestones, order and visibility shown on the homepage roadmap.', icon: LayersIcon, fields: ['roadmap_enabled','__roadmap'] },
  { id: 'films', label: 'Films & reels', short: 'Films', description: 'Give visitors a feel for the festival.', detail: 'Connect your trailer and aftermovie. You control what appears on the homepage.', icon: VideoIcon, fields: ['instagram_'] },
  { id: 'people', label: 'People & leadership', short: 'People', description: 'Put the people behind it in the picture.', detail: 'Choose which leadership groups appear, and set their movement and timing.', icon: LayersIcon, fields: ['show_faculty', 'show_committee', 'leadership_', 'committee_'] },
  { id: 'partners', label: 'Partner showcase', short: 'Partners', description: 'Give your partners their place.', detail: 'Homepage appearance only. Names, logos, previous/current edition and featured selection are managed once in Sponsors.', icon: MixIcon, fields: ['sponsor_', 'featured_partners'] },
] as const;

function readDraft(baseline: HomepageDraft): HomepageDraft {
  try {
    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) return { ...normalizeHomepageDraft(stored, baseline), sponsor_logos: baseline.sponsor_logos };
  } catch { /* A corrupt or unavailable local draft must not block the editor. */ }
  return baseline;
}

export const HomepageManagement = () => {
  const { homepageSettings, updateHomepageSettings, aboutSettings, updateAboutSettings, isOwner: checkOwner, myPermissions,
    facultyHeads = [], coreTeamMembers = [], coreCommittees = [], sponsors = [], events = [],
    updateFacultyHead, addFacultyHead, updateCoreTeamMember, addCoreTeamMember, socialMediaSettings, updateSocialMediaSettings, roadmapMilestones = [], addRoadmapMilestone, updateRoadmapMilestone } = useData();
  const owner = typeof checkOwner === 'function' && checkOwner();
  const canPage = (id: string) => owner || !!(myPermissions as { allowed_pages?: string[] } | null)?.allowed_pages?.includes(id);
  const canEditMedia = canPage('hero-media');
  const canEditAbout = canPage('about');
  const canEditLeads = canPage('rico-family') || (!(myPermissions as {page_access_configured?:boolean}|null)?.page_access_configured && (!!myPermissions?.can_faculty || !!myPermissions?.can_core_team));
  const canEditSocial = canPage('social');
  const canEditRoadmap = canPage('roadmap');
  const availableSections = sections.filter(section => (section.id !== 'media' || canEditMedia) && (section.id !== 'about' || canEditAbout) && (section.id !== 'social' || canEditSocial) && (section.id !== 'roadmap' || canEditRoadmap));
  const featuredEvents = useHomepageEvents(events);
  const [mediaSource, setMediaSource] = useState<HeroMediaV2 | null>(null);
  const [mediaError, setMediaError] = useState('');
  const [mediaRetry, setMediaRetry] = useState(0);
  useEffect(() => { let active = true; setMediaError('');
    heroMediaService.getHeroMedia('home', { strict: true }).then(raw => { const value = normalizeHeroMedia(raw); if (active) setMediaSource(!value.video_url && !value.mobile_video_url && !value.image_url && !value.mobile_image_url ? { ...value, background_type:'video' } : value); }).catch(() => { if (active) setMediaError('Background settings could not load. Retry before replacing media.'); });
    return () => { active = false; };
  }, [mediaRetry]);
  const mediaDraft = useStudioDraft('homepage_hero_resource_draft', mediaSource, normalizeHeroMedia);
  const aboutSource = useMemo(() => makeAboutDraft(aboutSettings), [aboutSettings]);
  const aboutDraft = useStudioDraft('homepage_about_resource_draft', aboutSource, normalizeAboutDraft);
  const leadDraft = useStudioDraft<LeadEdits>('homepage_lead_resource_draft', EMPTY_LEAD_EDITS, normalizeLeadEdits);
  const socialSource = useMemo(() => makeSocialDraft(socialMediaSettings), [socialMediaSettings]);
  const socialDraft = useStudioDraft('homepage_social_resource_draft', socialSource);
  const roadmapDraft = useStudioDraft<RoadmapEdits>('homepage_roadmap_resource_draft', EMPTY_ROADMAP_EDITS, normalizeRoadmapEdits);
  const [selectedLead, setSelectedLead] = useState('');
  const leadRecords: LeadDraft[] = Object.values(normalizeLeadEdits(Object.fromEntries([
    ...facultyHeads.map(lead => ({ key: `faculty-${lead.id}`, id: lead.id, kind: 'faculty' as const, name: lead.name, image: lead.image, role: lead.title, description: lead.description, instagram: personInstagram(lead)?.handle || '', facebook: lead.social_links?.facebook || '', phone: lead.phone || '', batch: personBatch(lead), enabled: lead.enabled, committee_id: null, order_position: lead.order_position })),
    ...coreTeamMembers.filter(lead => lead.is_head || lead.is_council).map(lead => ({ key: `team-${lead.id}`, id: lead.id, kind: lead.is_council ? 'council' as const : 'head' as const, name: lead.name, image: lead.image, role: lead.role, description: lead.description, instagram: personInstagram(lead)?.handle || '', phone: lead.phone || '', batch: personBatch(lead), enabled: lead.enabled, committee_id: lead.committee_id, order_position: lead.order_position })),
  ].map(lead => [lead.key,lead]))));
  const savedForm = useMemo(() => makeHomepageDraft(homepageSettings), [homepageSettings]);
  const [draft, setDraft] = useState(() => ({ form: readDraft(savedForm), baseline: savedForm }));
  const { form, baseline } = draft;
  const [params, setParams] = useSearchParams();
  const requested = params.get('edit');
  const activeSection: HomepageSection = availableSections.some(section => section.id === requested) ? requested as HomepageSection : canEditMedia ? 'media' : 'content';
  const selected = sections.find(section => section.id === activeSection)!;
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [savingPage, setSavingPage] = useState(false);
  const [showChanges, setShowChanges] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const savingProgress = useSavingProgress();
  const formElement = useRef<HTMLFormElement>(null);
  const saving = useRef(false);
  const pageDirty = hasHomepageChanges(form, baseline);
  const mediaDirty = canEditMedia && mediaDraft.dirty;
  const aboutDirty = canEditAbout && aboutDraft.dirty;
  const leadsDirty = canEditLeads && leadDraft.dirty;
  const socialDirty = canEditSocial && socialDraft.dirty;
  const roadmapDirty = canEditRoadmap && roadmapDraft.dirty;
  const isDirty = pageDirty || mediaDirty || aboutDirty || leadsDirty || socialDirty || roadmapDirty;
  const currentPayload = serializeHomepageDraft(form);
  const originalPayload = serializeHomepageDraft(baseline);
  const changedKeys = (Object.keys(currentPayload) as (keyof typeof currentPayload)[]).filter(key => JSON.stringify(currentPayload[key]) !== JSON.stringify(originalPayload[key]));
  const changeCount = changedKeys.length + Number(mediaDirty) + Number(aboutDirty) + Number(socialDirty) + (roadmapDirty ? Object.keys(roadmapDraft.form || {}).length : 0) + (leadsDirty ? Object.keys(leadDraft.form || {}).length : 0);
  const sectionChanged = (section: typeof sections[number]) => section.id === 'social' ? socialDirty : section.id === 'roadmap' ? roadmapDirty || changedKeys.includes('roadmap_enabled') : section.id === 'media' ? mediaDirty : section.id === 'about' ? aboutDirty : (section.id === 'people' && leadsDirty) || changedKeys.some(key => section.fields.some(prefix => key.startsWith(prefix)));

  useEffect(() => {
    setDraft(current => current.baseline === savedForm ? current : ({ form: hasHomepageChanges(current.form, current.baseline) ? current.form : savedForm, baseline: savedForm }));
  }, [savedForm]);
  useEffect(() => {
    try { if (pageDirty) localStorage.setItem(DRAFT_KEY, JSON.stringify(form)); else localStorage.removeItem(DRAFT_KEY); } catch { /* Editing still works if browser storage is disabled. */ }
  }, [form, pageDirty]);
  const setForm = useCallback((action: SetStateAction<HomepageDraft>) => {
    setMessage(null);
    setDraft(current => ({ ...current, form: typeof action === 'function' ? action(current.form) : action }));
  }, []);
  const selectSection = (section: HomepageSection) => { if (mediaBusy) return; setParams(previous => { const next = new URLSearchParams(previous); next.set('edit', section); return next; }); };
  const discard = () => { setDraft(current => ({ ...current, form: current.baseline })); mediaDraft.discard(); aboutDraft.discard(); leadDraft.discard(); socialDraft.discard(); roadmapDraft.discard(); setMessage({ type: 'success', text: 'Draft discarded. Saved content restored.' }); setShowChanges(false); };

  const handleSave = useCallback(async () => {
    if (mediaBusy || saving.current || !isDirty) return;
    if (!form.hero_title.trim()) { setMessage({ type: 'error', text: 'Add a festival title before saving.' }); return; }
    if (form.brand_year !== '' && form.brand_year != null && (Number(form.brand_year) < 2000 || Number(form.brand_year) > 2999)) { setMessage({ type: 'error', text: 'Festival year must be between 2000 and 2999.' }); return; }
    if (formElement.current && !formElement.current.reportValidity()) return;
    if (mediaDirty && mediaDraft.form?.enabled && mediaDraft.form.background_type !== 'image' && (mediaDraft.form.video_url !== mediaDraft.baseline?.video_url || mediaDraft.form.mobile_video_url !== mediaDraft.baseline?.mobile_video_url) && (!mediaDraft.form.video_url.trim() || !mediaDraft.form.mobile_video_url.trim())) { setMessage({ type: 'error', text: 'Add both the laptop video and the separate mobile video before publishing the background.' }); return; }
    if (leadsDirty && Object.values(leadDraft.form || {}).some(lead => !lead.name.trim() || (lead.enabled && !lead.image.trim()) || (lead.kind === 'head' && !lead.committee_id))) { setMessage({ type: 'error', text: 'Complete each lead’s name and photo, and select a department for committee heads.' }); return; }
    if (leadsDirty && Object.values(leadDraft.form || {}).some(lead => lead.instagram?.trim() && !instagramProfile(lead.instagram))) { setMessage({ type: 'error', text: 'Enter a valid Instagram handle or profile URL.' }); return; }
    if (leadsDirty && Object.values(leadDraft.form || {}).some(lead => lead.phone?.trim() && !phoneProfile(lead.phone))) { setMessage({type:'error',text:'Enter a valid phone number with country code.'}); return; }
    if (leadsDirty && Object.values(leadDraft.form || {}).some(lead => lead.kind === 'faculty' && lead.facebook?.trim() && !facebookProfile(lead.facebook))) { setMessage({type:'error',text:'Enter a valid Facebook profile URL or username.'}); return; }
    if (socialDirty && socialDraft.form) { const error = socialDraftError(socialDraft.form); if (error) {setMessage({type:'error',text:error});return;} }
    if (changedKeys.includes('roadmap_enabled') && !canEditRoadmap) {setMessage({type:'error',text:'Roadmap visibility changes require Roadmap page access.'});return;}
    if (roadmapDirty) {const all=mergeRoadmapDrafts(roadmapMilestones,roadmapDraft.form || {});const invalid=Object.values(roadmapDraft.form || {}).some(item=>!Number.isInteger(item.year)||item.year<1900||item.year>3000||(item.enabled&&!item.title.trim()&&!item.points.some(point=>point.trim()))||all.filter(other=>other.year===item.year).length>1);if(invalid){setMessage({type:'error',text:'Each roadmap milestone needs a unique valid year and a title or point when visible.'});return;} }
    const submitted = { ...form };
    const completed: string[] = [];
    saving.current = true; setSavingPage(true); setMessage(null);
    try {
      savingProgress.withSteps(1, 'Saving homepage…');
      if (mediaDirty && mediaDraft.form) { await heroMediaService.saveHeroMedia('home', mediaDraft.form); mediaDraft.commit(mediaDraft.form); completed.push('Background'); }
      if (pageDirty) { await updateHomepageSettings(serializeHomepageDraft(submitted)); setDraft(current => ({ ...current, baseline: submitted })); completed.push('Homepage'); }
      if (aboutDirty && aboutDraft.form) { const cleaned = { ...aboutDraft.form, hero_paragraphs: aboutDraft.form.hero_paragraphs.filter(text => text.trim()), tracks: aboutDraft.form.tracks.filter(text => text.trim()), zones: aboutDraft.form.zones.filter(text => text.trim()), stats: aboutDraft.form.stats.filter(stat => stat.value || stat.label) }; await updateAboutSettings(cleaned); aboutDraft.commit(aboutDraft.form); completed.push('About'); }
      if (leadsDirty) for (const [key,lead] of Object.entries(leadDraft.form || {})) {
        const common = { name: lead.name, image: lead.image, description: lead.description, enabled: lead.enabled, order_position: lead.order_position };
        if (lead.kind === 'faculty') { const existing = facultyHeads.find(person => person.id === lead.id); const patch = { ...common,title:lead.role,phone:lead.phone?.trim() || null,social_links:{...existing?.social_links,instagram:instagramProfile(lead.instagram)?.url || '',facebook:facebookProfile(lead.facebook) || '',batch:lead.batch?.trim() || ''} }; if (lead.id != null) await updateFacultyHead(lead.id,patch); else await addFacultyHead(patch); }
        else {
          const existing = coreTeamMembers.find(member => member.id === lead.id);
          const links = existing?.social_links && typeof existing.social_links === 'object' && !Array.isArray(existing.social_links) ? existing.social_links : {};
          const patch = { name: lead.name, image: lead.image, enabled: lead.enabled, order_position: lead.order_position, committee_id: lead.committee_id, phone: lead.phone?.trim() || null, is_head: lead.kind === 'head' || Boolean(existing?.is_head), is_council: lead.kind === 'council', social_links: { ...links, instagram: instagramProfile(lead.instagram)?.url || '', batch: lead.batch?.trim() || '' } };
          if (lead.id != null) await updateCoreTeamMember(lead.id, patch);
          else await addCoreTeamMember({ ...patch, role: lead.kind === 'head' ? 'Head' : 'Council', specialty: '', achievements: [] });
        }
        leadDraft.setForm(previous => Object.fromEntries(Object.entries(previous).filter(([id]) => id !== key))); completed.push(lead.name);
      }
      if (leadsDirty) { leadDraft.commit({}); setSelectedLead(''); }
      if (socialDirty && socialDraft.form) {await updateSocialMediaSettings({...socialDraft.form,instagram_url:socialDraft.form.instagram_url.trim()||null,youtube_url:socialDraft.form.youtube_url.trim()||null});socialDraft.commit(socialDraft.form);completed.push('Social links');}
      if (roadmapDirty) for(const [key,item] of Object.entries(roadmapDraft.form || {})){const patch={year:item.year,title:item.title.trim()||null,points:item.points.map(point=>point.trim()).filter(Boolean),images:item.images,enabled:item.enabled,order_position:item.order_position,side:item.side};if(item.id!=null)await updateRoadmapMilestone(item.id,patch);else await addRoadmapMilestone(patch);roadmapDraft.setForm(previous=>Object.fromEntries(Object.entries(previous).filter(([id])=>id!==key)));completed.push(`Roadmap ${item.year}`);}
      if(roadmapDirty)roadmapDraft.commit({});
      setSavedAt(new Date());
      setMessage({ type: 'success', text: 'Your homepage changes are saved.' });
      try { if (submitted.brand_logo_url) localStorage.setItem('rico_brand_logo_url', submitted.brand_logo_url); else localStorage.removeItem('rico_brand_logo_url'); } catch { /* Optional brand cache. */ }
    } catch (error) {
      setMessage({ type: 'error', text: `${completed.length ? `Saved: ${completed.join(', ')}. ` : ''}Could not save all changes. ${error instanceof Error ? error.message : 'Please try again.'} Remaining drafts are kept.` });
    } finally { saving.current = false; setSavingPage(false); savingProgress.done(); }
  }, [form, baseline, changedKeys, canEditRoadmap, socialDirty, socialDraft, roadmapDirty, roadmapDraft, roadmapMilestones, updateSocialMediaSettings, addRoadmapMilestone, updateRoadmapMilestone, isDirty, pageDirty, mediaBusy, mediaDirty, mediaDraft, aboutDirty, aboutDraft, leadsDirty, leadDraft, savingProgress, updateHomepageSettings, updateAboutSettings, updateFacultyHead, addFacultyHead, updateCoreTeamMember, addCoreTeamMember, coreTeamMembers, facultyHeads]);
  useEffect(() => {
    const saveShortcut = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void handleSave(); } };
    window.addEventListener('keydown', saveShortcut);
    return () => window.removeEventListener('keydown', saveShortcut);
  }, [handleSave]);
  const submit = (event: FormEvent) => { event.preventDefault(); void handleSave(); };
  const stateLabel = mediaBusy ? 'Uploading media…' : savingPage ? 'Saving changes…' : isDirty ? `${changeCount} unsaved ${changeCount === 1 ? 'change' : 'changes'}` : savedAt ? `Saved at ${new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(savedAt)}` : 'All changes saved';

  return <div className="homepage-studio">
    <header className="studio-page-header"><div><span className="studio-eyebrow"><GlobeIcon />WEBSITE STUDIO<span>/</span>HOMEPAGE</span><h1>Homepage studio.</h1><p>Your festival, your way. Shape the details and see them come together.</p></div><Link to="/" target="_blank" rel="noreferrer" className="studio-button studio-button-secondary">View website<ArrowTopRightIcon /></Link></header>
    <div className="studio-workspace-bar"><div className="studio-document"><span className="studio-document-icon"><GlobeIcon /></span><span><strong>Homepage</strong><small>Website content & appearance</small></span><span className="studio-document-badge">Editor</span></div><div className={`studio-save-indicator${isDirty ? ' is-dirty' : ''}`} role="status" aria-live="polite">{isDirty ? <span /> : <CheckCircledIcon />}{stateLabel}</div></div>
    <nav className="studio-section-nav" aria-label="Homepage editor sections">{availableSections.map((section, index) => <button type="button" key={section.id} disabled={mediaBusy} aria-label={section.label} aria-current={activeSection === section.id ? 'page' : undefined} onClick={() => selectSection(section.id)}><section.icon /><span>{section.short}</span>{sectionChanged(section) && <i aria-label="Unsaved changes" />}{activeSection === section.id && <motion.span className="studio-active-tab" layoutId="homepage-active-tab" transition={{ type: 'spring', stiffness: 350, damping: 32 }} />}<span className="studio-tab-number">0{index + 1}</span></button>)}</nav>
    <AnimatePresence>{message && <motion.div className={`studio-feedback studio-feedback-${message.type}`} role={message.type === 'error' ? 'alert' : 'status'} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{message.type === 'error' ? <ExclamationTriangleIcon /> : <CheckCircledIcon />}<span>{message.text}</span><button type="button" aria-label="Dismiss message" onClick={() => setMessage(null)}><Cross2Icon /></button></motion.div>}</AnimatePresence>
    {showChanges && <section className="studio-changes" aria-label="Unsaved change review"><header><strong>{isDirty ? 'Changes in this draft' : 'No unsaved changes'}</strong><button type="button" aria-label="Close change review" onClick={() => setShowChanges(false)}><Cross2Icon /></button></header>{socialDirty && <p>Website social links changed.</p>}{roadmapDirty && <p>Roadmap milestones changed.</p>}{mediaDirty && <p>Background assets and device settings changed.</p>}{aboutDirty && <p>About section changed.</p>}{leadsDirty && <p>{Object.keys(leadDraft.form || {}).length} leadership profiles changed.</p>}{changedKeys.map(key => <div key={key}><span>{key.replace(/_/g, ' ').replace(/^instagram /, '')}</span><del>{String(originalPayload[key] ?? 'Empty')}</del><ChevronRightIcon /><strong>{String(currentPayload[key] ?? 'Empty')}</strong></div>)}</section>}
    <div className="studio-columns" data-section={activeSection}>
      <form className="studio-edit-panel" ref={formElement} onSubmit={submit}>
        <header className="studio-panel-heading"><span className="studio-panel-icon"><selected.icon /></span><div><span>0{sections.indexOf(selected) + 1} / CUSTOMIZE</span><h2>{selected.label}</h2><p>{selected.detail}</p></div></header>
        <fieldset className="studio-fields" disabled={savingPage}><motion.div key={activeSection} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 25 }}>
          {activeSection === 'media' && (mediaError ? <div className="studio-feedback" role="alert"><p>{mediaError}</p><button type="button" onClick={() => setMediaRetry(value => value + 1)}>Retry background</button></div> : mediaDraft.form ? <HomepageMediaEditor media={mediaDraft.form} setMedia={mediaDraft.setForm} onProcessingChange={setMediaBusy} /> : <div className="studio-field-group" role="status">Loading background settings…</div>)}
          {activeSection === 'social' && socialDraft.form && <HomepageSocialEditor form={socialDraft.form} setForm={socialDraft.setForm} />}
          {activeSection === 'roadmap' && <HomepageRoadmapEditor records={roadmapMilestones} edits={roadmapDraft.form || {}} setEdits={roadmapDraft.setForm} form={form} setForm={setForm} onProcessingChange={setMediaBusy} />}
          {activeSection === 'about' && aboutDraft.form && <HomepageAboutEditor form={aboutDraft.form} setForm={aboutDraft.setForm} />}
          {activeSection === 'automatic' && <HomepageAutomation events={featuredEvents} />}
          {activeSection === 'content' && <HeroContentSettings form={form} setForm={setForm} />}
          {activeSection === 'branding' && <BrandingSettings form={form} setForm={setForm} onProcessingChange={setMediaBusy} />}
          {activeSection === 'films' && <InstagramIntegrationSettings form={form} setForm={setForm} />}
          {activeSection === 'people' && <><LeadershipSettings form={form} setForm={setForm} />{canEditLeads && <LeadEditor leads={leadRecords} edits={leadDraft.form || {}} setEdits={leadDraft.setForm} selected={selectedLead || leadRecords[0]?.key || ''} onSelect={setSelectedLead} committees={coreCommittees} busy={mediaBusy} onProcessingChange={setMediaBusy} />}</>}
          {activeSection === 'partners' && <PartnersSectionSettings form={form} setForm={setForm} />}
        </motion.div></fieldset>
        <div className="studio-edit-tip"><span><CheckCircledIcon /></span><p>Your draft stays with you.<small>Switch sections freely. Changes go live only when you save.</small></p></div>

      </form>
      <HomepagePreview social={socialDraft.form} roadmapItems={mergeRoadmapDrafts(roadmapMilestones,roadmapDraft.form || {})} mediaOverride={mediaDraft.form} mediaPending={!mediaSource && !mediaError} about={aboutDraft.form} featuredEvents={featuredEvents} leadOverrides={Object.values(leadDraft.form || {})} form={form} activeSection={activeSection} onSelectSection={selectSection} faculty={facultyHeads} heads={coreTeamMembers.filter(member => member.is_head || member.is_council)} sponsors={sponsors} dirty={isDirty} />
    </div>
    <footer className="studio-save-bar"><div className="studio-save-summary"><span className={isDirty ? 'is-dirty' : ''}>{isDirty ? <Pencil2Icon /> : <CheckCircledIcon />}</span><div><strong>{stateLabel}</strong><small>{isDirty ? 'Draft kept in this browser' : 'You’re up to date'}</small></div>{isDirty && <button type="button" className="studio-text-button" onClick={() => setShowChanges(value => !value)}>Review changes<ChevronRightIcon /></button>}</div><div className="studio-save-actions"><button type="button" className="studio-button studio-button-ghost" disabled={savingPage || mediaBusy || !isDirty} onClick={discard}><ResetIcon />Discard changes</button><button type="button" className="studio-button studio-button-primary" aria-label="Save changes" disabled={savingPage || mediaBusy || !isDirty} onClick={() => void handleSave()}>{savingPage ? <ReloadIcon className="studio-spin" /> : <CheckCircledIcon />}{savingPage ? 'Saving…' : 'Save changes'}<kbd>⌘ S</kbd></button></div></footer>
  </div>;
};
