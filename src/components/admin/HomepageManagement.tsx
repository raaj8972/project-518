import { SITE_FEATURES } from '../../constants/siteFeatures';
import { HomepageSocialEditor, makeSocialDraft, socialDraftError } from './homepage/HomepageSocialEditor';
import { HomepageRoadmapEditor } from './homepage/HomepageRoadmapEditor';
import { mergeRoadmapDrafts, normalizeRoadmapEdits, type RoadmapEdits } from '../../utils/homepageRoadmap';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type SetStateAction } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircledIcon, ChevronRightIcon, Cross2Icon, ExclamationTriangleIcon, GlobeIcon, ImageIcon, LayersIcon, Pencil2Icon, ReloadIcon, ResetIcon, VideoIcon } from '@radix-ui/react-icons';
import { useData } from '../../context/DataContext';
import { useSavingProgress } from '../../context/SavingProgressContext';
import { HeroContentSettings } from './homepage/HeroContentSettings';
import { BrandingSettings } from './homepage/BrandingSettings';
import { useStudioDraft } from '../../hooks/useStudioDraft';
import { heroMediaService, normalizeHeroMedia, type HeroMediaV2 } from '../../services/heroMediaService';
import { HomepageMediaEditor } from './homepage/HomepageMediaEditor';
import { HomepageAboutEditor, makeAboutDraft, normalizeAboutDraft } from './homepage/HomepageAboutEditor';
import { makeHomepageDraft, normalizeHomepageDraft, serializeHomepageDraft, type HomepageDraft, type HomepageSection } from './homepage/homepageForm';
import '../../styles/HomepageStudio.css';

const EMPTY_ROADMAP_EDITS: RoadmapEdits = {};
const DRAFT_KEY = 'admin_homepage_form_draft';
const sections = [
  { id: 'media', label: 'Background video & images', short: 'Background', description: 'Separate media for every screen.', detail: 'Replace the homepage background. Upload separate laptop and mobile assets, then save to publish.', icon: VideoIcon, fields: ['__hero_media'] },
  { id: 'content', label: 'Page content', short: 'Hero text', description: 'The words that welcome everyone in.', detail: 'Set your festival title, tagline and introduction. Save to publish your changes.', icon: Pencil2Icon, fields: ['hero_title', 'hero_subtitle', 'hero_description'] },
  { id: 'branding', label: 'Brand identity', short: 'Logo & year', description: 'Make the festival unmistakably yours.', detail: 'Update the edition, upload your logo and fine-tune how it appears.', icon: ImageIcon, fields: ['brand_'] },
  { id: 'about', label: 'About the festival', short: 'About', description: 'Your festival story.', detail: 'Edit your homepage About section, tracks, zones and verified statistics.', icon: Pencil2Icon, fields: ['__about'] },
  { id: 'social', label: 'Social media links', short: 'Footer links', description: 'Website social links.', detail: 'Manage Instagram and YouTube links and visibility without leaving Homepage Studio.', icon: GlobeIcon, fields: ['__social'] },
  { id: 'roadmap', label: 'Chronicles', short: 'Chronicles', description: 'Your festival journey.', detail: 'Tell your festival’s story, one edition at a time. Manage highlights, photos and the order visitors see.', icon: LayersIcon, fields: ['roadmap_enabled','__roadmap'] },
] as const;

// People are maintained exclusively in Rico Family, never by the Home editor.
function serializeEditorDraft(form: HomepageDraft) {
  const payload: Partial<ReturnType<typeof serializeHomepageDraft>> = serializeHomepageDraft(form);
  for (const key of Object.keys(payload) as (keyof typeof payload)[]) {
    if (key.startsWith('instagram_trailer_') || key.startsWith('instagram_aftermovie_')) delete payload[key];
  }
  delete payload.show_faculty_heads;
  delete payload.show_committee_heads;
  delete payload.leadership_carousel_speed_ms;
  delete payload.committee_marquee_speed_px_per_sec;
  delete payload.committee_marquee_direction;
  return payload;
}
function hasEditorChanges(form: HomepageDraft, baseline: HomepageDraft) {
  return JSON.stringify(serializeEditorDraft(form)) !== JSON.stringify(serializeEditorDraft(baseline));
}

function readDraft(baseline: HomepageDraft): HomepageDraft {
  try {
    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) return { ...normalizeHomepageDraft(stored, baseline), sponsor_logos: baseline.sponsor_logos };
  } catch { /* A corrupt or unavailable local draft must not block the editor. */ }
  return baseline;
}

export const HomepageManagement = () => {
  const { homepageSettings, updateHomepageSettings, aboutSettings, updateAboutSettings, isOwner: checkOwner, myPermissions,
    socialMediaSettings, updateSocialMediaSettings, roadmapMilestones = [], addRoadmapMilestone, updateRoadmapMilestone } = useData();
  const owner = typeof checkOwner === 'function' && checkOwner();
  const canPage = (id: string) => owner || !!(myPermissions as { allowed_pages?: string[] } | null)?.allowed_pages?.includes(id);
  const canEditMedia = SITE_FEATURES.homepageBackgroundEditor && canPage('hero-media');
  const canEditAbout = canPage('about');

  const canEditSocial = canPage('social');
  const canEditRoadmap = canPage('roadmap');
  const availableSections = sections.filter(section => (section.id !== 'media' || canEditMedia) && (section.id !== 'about' || canEditAbout) && (section.id !== 'social' || canEditSocial) && (section.id !== 'roadmap' || canEditRoadmap));
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

  const socialSource = useMemo(() => makeSocialDraft(socialMediaSettings), [socialMediaSettings]);
  const socialDraft = useStudioDraft('homepage_social_resource_draft', socialSource);
  const roadmapDraft = useStudioDraft<RoadmapEdits>('homepage_roadmap_resource_draft', EMPTY_ROADMAP_EDITS, normalizeRoadmapEdits);
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
  const pageDirty = hasEditorChanges(form, baseline);
  const mediaDirty = canEditMedia && mediaDraft.dirty;
  const aboutDirty = canEditAbout && aboutDraft.dirty;

  const socialDirty = canEditSocial && socialDraft.dirty;
  const roadmapDirty = canEditRoadmap && roadmapDraft.dirty;
  const isDirty = pageDirty || mediaDirty || aboutDirty || socialDirty || roadmapDirty;
  const currentPayload = serializeEditorDraft(form);
  const originalPayload = serializeEditorDraft(baseline);
  const changedKeys = (Object.keys(currentPayload) as (keyof typeof currentPayload)[]).filter(key => JSON.stringify(currentPayload[key]) !== JSON.stringify(originalPayload[key]));
  const changeCount = changedKeys.length + Number(mediaDirty) + Number(aboutDirty) + Number(socialDirty) + (roadmapDirty ? Object.keys(roadmapDraft.form || {}).length : 0);
  const sectionChanged = (section: typeof sections[number]) => section.id === 'social' ? socialDirty : section.id === 'roadmap' ? roadmapDirty || changedKeys.includes('roadmap_enabled') : section.id === 'media' ? mediaDirty : section.id === 'about' ? aboutDirty : changedKeys.some(key => section.fields.some(prefix => key.startsWith(prefix)));

  useEffect(() => {
    setDraft(current => current.baseline === savedForm ? current : ({ form: hasEditorChanges(current.form, current.baseline) ? current.form : savedForm, baseline: savedForm }));
  }, [savedForm]);
  useEffect(() => {
    try { if (pageDirty) localStorage.setItem(DRAFT_KEY, JSON.stringify(form)); else localStorage.removeItem(DRAFT_KEY); } catch { /* Editing still works if browser storage is disabled. */ }
  }, [form, pageDirty]);
  const setForm = useCallback((action: SetStateAction<HomepageDraft>) => {
    setMessage(null);
    setDraft(current => ({ ...current, form: typeof action === 'function' ? action(current.form) : action }));
  }, []);
  const selectSection = (section: HomepageSection) => { if (mediaBusy) return; setParams(previous => { const next = new URLSearchParams(previous); next.set('edit', section); return next; }); };
  const discard = () => { setDraft(current => ({ ...current, form: current.baseline })); mediaDraft.discard(); aboutDraft.discard(); socialDraft.discard(); roadmapDraft.discard(); setMessage({ type: 'success', text: 'Draft discarded. Saved content restored.' }); setShowChanges(false); };

  const handleSave = useCallback(async () => {
    if (mediaBusy || saving.current || !isDirty) return;
    if (!form.hero_title.trim()) { setMessage({ type: 'error', text: 'Add a festival title before saving.' }); return; }
    if (form.brand_year !== '' && form.brand_year != null && (Number(form.brand_year) < 2000 || Number(form.brand_year) > 2999)) { setMessage({ type: 'error', text: 'Festival year must be between 2000 and 2999.' }); return; }
    if (formElement.current && !formElement.current.reportValidity()) return;
    if (mediaDirty && mediaDraft.form?.enabled && mediaDraft.form.background_type !== 'image' && (mediaDraft.form.video_url !== mediaDraft.baseline?.video_url || mediaDraft.form.mobile_video_url !== mediaDraft.baseline?.mobile_video_url) && (!mediaDraft.form.video_url.trim() || !mediaDraft.form.mobile_video_url.trim())) { setMessage({ type: 'error', text: 'Add both the laptop video and the separate mobile video before publishing the background.' }); return; }
    if (socialDirty && socialDraft.form) { const error = socialDraftError(socialDraft.form); if (error) {setMessage({type:'error',text:error});return;} }
    if (changedKeys.includes('roadmap_enabled') && !canEditRoadmap) {setMessage({type:'error',text:'Roadmap visibility changes require Roadmap page access.'});return;}
    if (roadmapDirty) {const all=mergeRoadmapDrafts(roadmapMilestones,roadmapDraft.form || {});const invalid=Object.values(roadmapDraft.form || {}).some(item=>!Number.isInteger(item.year)||item.year<1900||item.year>3000||(item.enabled&&!item.title.trim()&&!item.points.some(point=>point.trim()))||all.filter(other=>other.year===item.year).length>1);if(invalid){setMessage({type:'error',text:'Each roadmap milestone needs a unique valid year and a title or point when visible.'});return;} }
    const submitted = { ...form };
    const completed: string[] = [];
    saving.current = true; setSavingPage(true); setMessage(null);
    try {
      savingProgress.withSteps(1, 'Saving homepage…');
      if (mediaDirty && mediaDraft.form) { await heroMediaService.saveHeroMedia('home', mediaDraft.form); mediaDraft.commit(mediaDraft.form); completed.push('Background'); }
      if (pageDirty) { await updateHomepageSettings(serializeEditorDraft(submitted)); setDraft(current => ({ ...current, baseline: submitted })); completed.push('Homepage'); }
      if (aboutDirty && aboutDraft.form) { const cleaned = { ...aboutDraft.form, hero_paragraphs: aboutDraft.form.hero_paragraphs.filter(text => text.trim()), tracks: aboutDraft.form.tracks.filter(text => text.trim()), zones: aboutDraft.form.zones.filter(text => text.trim()), stats: aboutDraft.form.stats.filter(stat => stat.value || stat.label) }; await updateAboutSettings(cleaned); aboutDraft.commit(aboutDraft.form); completed.push('About'); }
      if (socialDirty && socialDraft.form) {await updateSocialMediaSettings({...socialDraft.form,instagram_url:socialDraft.form.instagram_url.trim()||null,youtube_url:socialDraft.form.youtube_url.trim()||null});socialDraft.commit(socialDraft.form);completed.push('Social links');}
      if (roadmapDirty) for(const [key,item] of Object.entries(roadmapDraft.form || {})){const patch={year:item.year,title:item.title.trim()||null,points:item.points.map(point=>point.trim()).filter(Boolean),images:item.images,enabled:item.enabled,order_position:item.order_position,side:item.side};if(item.id!=null)await updateRoadmapMilestone(item.id,patch);else await addRoadmapMilestone(patch);roadmapDraft.setForm(previous=>Object.fromEntries(Object.entries(previous).filter(([id])=>id!==key)));completed.push(`Roadmap ${item.year}`);}
      if(roadmapDirty)roadmapDraft.commit({});
      setSavedAt(new Date());
      setMessage({ type: 'success', text: 'Your homepage changes are saved.' });
      try { if (submitted.brand_logo_url) localStorage.setItem('rico_brand_logo_url', submitted.brand_logo_url); else localStorage.removeItem('rico_brand_logo_url'); } catch { /* Optional brand cache. */ }
    } catch (error) {
      setMessage({ type: 'error', text: `${completed.length ? `Saved: ${completed.join(', ')}. ` : ''}Could not save all changes. ${error instanceof Error ? error.message : 'Please try again.'} Remaining drafts are kept.` });
    } finally { saving.current = false; setSavingPage(false); savingProgress.done(); }
  }, [form, baseline, changedKeys, canEditRoadmap, socialDirty, socialDraft, roadmapDirty, roadmapDraft, roadmapMilestones, updateSocialMediaSettings, addRoadmapMilestone, updateRoadmapMilestone, isDirty, pageDirty, mediaBusy, mediaDirty, mediaDraft, aboutDirty, aboutDraft, savingProgress, updateHomepageSettings, updateAboutSettings]);
  useEffect(() => {
    const saveShortcut = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void handleSave(); } };
    window.addEventListener('keydown', saveShortcut);
    return () => window.removeEventListener('keydown', saveShortcut);
  }, [handleSave]);
  const submit = (event: FormEvent) => { event.preventDefault(); void handleSave(); };
  const stateLabel = mediaBusy ? 'Uploading media…' : savingPage ? 'Saving changes…' : isDirty ? `${changeCount} unsaved ${changeCount === 1 ? 'change' : 'changes'}` : savedAt ? `Saved at ${new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(savedAt)}` : 'All changes saved';

  return <div className="homepage-studio">

    <div className="studio-workspace-bar"><div className="studio-document"><span className="studio-document-icon"><GlobeIcon /></span><span><strong>Homepage</strong><small>Website content & appearance</small></span><span className="studio-document-badge">Editor</span></div><div className={`studio-save-indicator${isDirty ? ' is-dirty' : ''}`} role="status" aria-live="polite">{isDirty ? <span /> : <CheckCircledIcon />}{stateLabel}</div></div>
    <nav className="studio-section-nav" aria-label="Homepage editor sections">{availableSections.map((section, index) => <button type="button" key={section.id} disabled={mediaBusy} aria-label={section.label} aria-current={activeSection === section.id ? 'page' : undefined} onClick={() => selectSection(section.id)}><section.icon /><span>{section.short}</span>{sectionChanged(section) && <i aria-label="Unsaved changes" />}{activeSection === section.id && <motion.span className="studio-active-tab" layoutId="homepage-active-tab" transition={{ type: 'spring', stiffness: 350, damping: 32 }} />}<span className="studio-tab-number">0{index + 1}</span></button>)}</nav>
    <AnimatePresence>{message && <motion.div className={`studio-feedback studio-feedback-${message.type}`} role={message.type === 'error' ? 'alert' : 'status'} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{message.type === 'error' ? <ExclamationTriangleIcon /> : <CheckCircledIcon />}<span>{message.text}</span><button type="button" aria-label="Dismiss message" onClick={() => setMessage(null)}><Cross2Icon /></button></motion.div>}</AnimatePresence>
    {showChanges && <section className="studio-changes" aria-label="Unsaved change review"><header><strong>{isDirty ? 'Changes in this draft' : 'No unsaved changes'}</strong><button type="button" aria-label="Close change review" onClick={() => setShowChanges(false)}><Cross2Icon /></button></header>{socialDirty && <p>Website social links changed.</p>}{roadmapDirty && <p>Roadmap milestones changed.</p>}{mediaDirty && <p>Background assets and device settings changed.</p>}{aboutDirty && <p>About section changed.</p>}{changedKeys.map(key => <div key={key}><span>{key.replace(/_/g, ' ').replace(/^instagram /, '')}</span><del>{String(originalPayload[key] ?? 'Empty')}</del><ChevronRightIcon /><strong>{String(currentPayload[key] ?? 'Empty')}</strong></div>)}</section>}
    <div className="studio-editor" data-section={activeSection}>
      <form className="studio-edit-panel" ref={formElement} onSubmit={submit}>
        <header className="studio-panel-heading"><span className="studio-panel-icon"><selected.icon /></span><div><span>{String(availableSections.indexOf(selected) + 1).padStart(2, '0')} / CUSTOMIZE</span><h2>{selected.label}</h2><p>{selected.detail}</p></div></header>
        <fieldset className="studio-fields" disabled={savingPage}><motion.div key={activeSection} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 25 }}>
          {activeSection === 'media' && (mediaError ? <div className="studio-feedback" role="alert"><p>{mediaError}</p><button type="button" onClick={() => setMediaRetry(value => value + 1)}>Retry background</button></div> : mediaDraft.form ? <HomepageMediaEditor media={mediaDraft.form} setMedia={mediaDraft.setForm} onProcessingChange={setMediaBusy} /> : <div className="studio-field-group" role="status">Loading background settings…</div>)}
          {activeSection === 'social' && socialDraft.form && <HomepageSocialEditor form={socialDraft.form} setForm={socialDraft.setForm} />}
          {activeSection === 'roadmap' && <HomepageRoadmapEditor records={roadmapMilestones} edits={roadmapDraft.form || {}} setEdits={roadmapDraft.setForm} form={form} setForm={setForm} onProcessingChange={setMediaBusy} />}
          {activeSection === 'about' && aboutDraft.form && <HomepageAboutEditor form={aboutDraft.form} setForm={aboutDraft.setForm} />}
          {activeSection === 'content' && <HeroContentSettings form={form} setForm={setForm} />}
          {activeSection === 'branding' && <BrandingSettings form={form} setForm={setForm} onProcessingChange={setMediaBusy} />}
        </motion.div></fieldset>
        <div className="studio-edit-tip"><span><CheckCircledIcon /></span><p>Your draft stays with you.<small>Switch sections freely. Changes go live only when you save.</small></p></div>

      </form>
    </div>
    <footer className="studio-save-bar"><div className="studio-save-summary"><span className={isDirty ? 'is-dirty' : ''}>{isDirty ? <Pencil2Icon /> : <CheckCircledIcon />}</span><div><strong>{stateLabel}</strong><small>{isDirty ? 'Draft kept in this browser' : 'You’re up to date'}</small></div>{isDirty && <button type="button" className="studio-text-button" onClick={() => setShowChanges(value => !value)}>Review changes<ChevronRightIcon /></button>}</div><div className="studio-save-actions"><button type="button" className="studio-button studio-button-ghost" disabled={savingPage || mediaBusy || !isDirty} onClick={discard}><ResetIcon />Discard changes</button><button type="button" className="studio-button studio-button-primary" aria-label="Save changes" disabled={savingPage || mediaBusy || !isDirty} onClick={() => void handleSave()}>{savingPage ? <ReloadIcon className="studio-spin" /> : <CheckCircledIcon />}{savingPage ? 'Saving…' : 'Save changes'}<kbd>⌘ S</kbd></button></div></footer>
  </div>;
};
