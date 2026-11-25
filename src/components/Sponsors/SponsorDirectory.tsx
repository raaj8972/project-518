'use client';

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon, Cross2Icon, ExternalLinkIcon, GridIcon, LayersIcon, ReloadIcon } from '@radix-ui/react-icons';
import { Crown, Plane, GraduationCap, Utensils, Monitor, HeartPulse, ShoppingBag, Radio, Handshake, Users, CalendarDays, Mail, Phone, MapPin, Instagram } from 'lucide-react';
import { useFestivalDialog } from '../../hooks/useFestivalDialog';
import type { DisplayPartner } from '../../utils/homepageContent';
import { groupPartners, groupPartnerArchives, isTitlePartner, safeSponsorLink, type PartnerTone } from '../../utils/sponsorPresentation';
import type { SponsorshipSettings, SponsorshipPackage } from '../../types/data';
import { sponsorshipEmailHref, type SponsorshipPerson } from '../../utils/sponsorshipContacts';
import { BrochureDownload } from './BrochureDownload';
import { SponsorshipPackagesGrid } from './SponsorshipPackagesGrid';

interface SponsorDirectoryProps {
  partners: DisplayPartner[];
  year: number;
  settings: (SponsorshipSettings & { page_title?: string | null }) | null;
  packages: SponsorshipPackage[];
  loading?: boolean;
  error?: string | null;
  onRetry: () => void;
  instagramUrl?: string;
  teamContacts?: SponsorshipPerson[];
}

function CategoryIcon({ tone, className }: { tone: PartnerTone; className?: string }) {
  const Icon = { travel: Plane, study: GraduationCap, food: Utensils, technology: Monitor, health: HeartPulse, lifestyle: ShoppingBag, media: Radio, community: Handshake }[tone];
  return <Icon className={className} strokeWidth={1.5} aria-hidden="true" />;
}

function Laurel({ className = '' }: { className?: string }) {
  return <svg className={`sponsor-laurel ${className}`} viewBox="0 0 52 100" fill="currentColor" aria-hidden="true">
    <path d="M43 94C10 75 6 39 32 7l-2-1C3 39 7 76 42 97Z" />
    {Array.from({ length: 7 }, (_, i) => <g key={i} transform={`translate(${18 - Math.sin(i / 6 * Math.PI) * 9 + i * 1.5},${17 + i * 10}) rotate(${-20 - i * 9})`}><path d="M0 0C-11-1-13-7-12-12-4-10 0-6 0 0Z" /><path d="M1 0C10-4 10-9 9-13 2-10 0-5 1 0Z" /></g>)}
  </svg>;
}

function SectionHeading({ children, id }: { children: ReactNode; id?: string }) {
  return <div className="sponsor-section-heading"><span aria-hidden="true" /><h2 id={id}>{children}</h2><span aria-hidden="true" /></div>;
}

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduceMotion = useReducedMotion();
  return <motion.div className={className} initial={false} whileInView={reduceMotion ? { opacity: 1, y: 0 } : { opacity: [.65, 1], y: [14, 0] }} viewport={{ once: true, amount: .08 }} transition={{ duration: .55, delay, ease: [.22, 1, .36, 1] }}>{children}</motion.div>;
}

function PartnerLogo({ partner, featured = false }: { partner: DisplayPartner; featured?: boolean }) {
  const [failedLogo, setFailedLogo] = useState('');
  const href = safeSponsorLink(partner.website);
  const content = <><span className="sponsor-logo-image">{failedLogo !== partner.logo
    ? <img src={partner.logo} alt="" loading="lazy" decoding="async" onError={() => setFailedLogo(partner.logo)} />
    : <span className="sponsor-logo-initials">{partner.name.split(/\s+/).slice(0, 2).map(word => word[0]).join('')}</span>}</span><span className={`sponsor-logo-name${failedLogo !== partner.logo ? ' sr-only' : ''}`}>{partner.name}</span>{featured && <span className="sponsor-feature-tier"><Laurel />{partner.category}<Laurel className="is-reversed" /></span>}{href && <ExternalLinkIcon className="sponsor-logo-external" aria-hidden="true" />}</>;
  const className = `sponsor-logo-tile${featured ? ' sponsor-feature-card' : ''}`;
  return href ? <a className={className} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${partner.name} website (opens in a new tab)`}>{content}</a>
    : <div className={className} aria-label={partner.name}>{content}</div>;
}

function ContactDialog({ open, onClose, settings, instagramUrl, year, teamContacts = [], selectedTier }: { open: boolean; onClose: () => void; selectedTier?: string } & Pick<SponsorDirectoryProps, 'settings' | 'instagramUrl' | 'year' | 'teamContacts'>) {
  const ref = useFestivalDialog(open, onClose);
  const titleId = useId();
  const brochure = safeSponsorLink(settings?.brochure_url);
  const instagram = safeSponsorLink(instagramUrl);
  const contacts = settings?.contactSections?.filter(section => section.enabled) || [];
  if (!open) return null;
  return createPortal(<div className="sponsor-dialog-layer"><div className="sponsor-dialog-backdrop" onClick={onClose} /><div className="sponsor-contact-dialog" ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} data-lenis-prevent>
    <button type="button" className="sponsor-round-button sponsor-dialog-close" aria-label="Close sponsorship details" onClick={onClose}><Cross2Icon /></button>
    <Handshake className="sponsor-contact-mark" strokeWidth={1.3} aria-hidden="true" /><p className="sponsor-eyebrow">RICORRENZA {year}</p>
    <h2 id={titleId}>{settings?.call_to_action_text || 'Be part of the celebration'}</h2><p>Connect with our sponsorship team and PR heads.</p>
    {selectedTier && <p className="sponsor-selected-tier">Your partnership interest <strong>{selectedTier}</strong></p>}
    {contacts.length > 0 && <div className="sponsor-contact-grid">{contacts.map(contact => {
      const Icon = contact.type === 'phone' ? Phone : contact.type === 'address' ? MapPin : Mail;
      const href = contact.type === 'email' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.content.trim()) ? sponsorshipEmailHref(contact.content.trim(), year, selectedTier)
        : contact.type === 'phone' && /^[+\d\s()-]+$/.test(contact.content.trim()) ? `tel:${contact.content.replace(/[^+\d]/g, '')}` : undefined;
      return <div key={contact.id}><Icon strokeWidth={1.5} aria-hidden="true" /><h3>{contact.title}</h3>{href ? <a href={href}>{contact.content}</a> : <p>{contact.content}</p>}</div>;
    })}</div>}
    {(['sponsorship', 'pr'] as const).map(group => {
      const people = teamContacts.filter(person => person.group === group);
      return people.length > 0 && <section className="sponsor-team-contacts" key={group} aria-label={group === 'sponsorship' ? 'Sponsorship team' : 'PR team heads'}><h3>{group === 'sponsorship' ? 'Sponsorship team' : 'PR team heads'}</h3><div>{people.map(person => <article key={person.id}><h4>{person.name}</h4><p>{person.role || person.committee}</p><div>{person.phone && <a href={person.phone.url} aria-label={`Call ${person.name}`}><Phone strokeWidth={1.5} />{person.phone.number}</a>}{person.email && <a href={sponsorshipEmailHref(person.email, year, selectedTier)} aria-label={`Email ${person.name}`}><Mail strokeWidth={1.5} />{person.email}</a>}{!person.phone && !person.email && <span>Contact details will be added soon.</span>}</div></article>)}</div></section>;
    })}
    {!contacts.length && !teamContacts.length && !instagram && !brochure && <p className="sponsor-contact-pending">Sponsorship contact details will be announced here soon.</p>}
    <div className="sponsor-contact-actions"><BrochureDownload url={brochure} year={year} label={settings?.brochure_title || 'Download sponsorship brochure'} />{instagram && <a className="sponsor-action sponsor-action-secondary" href={instagram} target="_blank" rel="noopener noreferrer"><Instagram size={18} strokeWidth={1.5} />Contact on Instagram<ExternalLinkIcon /></a>}</div>
    {teamContacts.length > 0 && <a className="sponsor-team-family-link" href="/rico-family">Meet the organising team<ArrowRightIcon /></a>}
  </div></div>, document.body);
}

export function SponsorDirectory({ partners, year, settings, packages, loading = false, error, onRetry, instagramUrl, teamContacts = [] }: SponsorDirectoryProps) {
  const [category, setCategory] = useState('all');
  const [expanded, setExpanded] = useState(false);
  const [archiveKey, setArchiveKey] = useState('');
  const [archiveExpanded, setArchiveExpanded] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string>();
  const openContact = (tier?: string) => { setSelectedTier(tier); setContactOpen(true); };
  const reduceMotion = useReducedMotion();
  const pageRef = useRef<HTMLDivElement>(null);
  const archiveRef = useRef<HTMLElement>(null);
  const id = useId();
  const current = useMemo(() => partners.filter(partner => partner.period === 'current'), [partners]);
  const groups = useMemo(() => groupPartners(current), [current]);
  const archives = useMemo(() => groupPartnerArchives(partners, year), [partners, year]);
  const archive = archives.find(item => item.key === archiveKey) || archives[0];
  const activeCategory = groups.some(group => group.key === category) ? category : 'all';
  const activeGroups = groups.filter(group => activeCategory === 'all' || group.key === activeCategory);
  const filtered = activeCategory === 'all' ? current : activeGroups.flatMap(group => group.partners);
  const titles = filtered.filter(isTitlePartner);
  const years = [...new Set([...Array.from({ length: 5 }, (_, index) => year - 4 + index), ...archives.flatMap(item => item.year ? [item.year] : [])])].sort((a, b) => a - b);
  const filters = [{ key: 'all', label: 'All partners', count: current.length, tone: undefined }, ...groups.map(group => ({ ...group, count: group.partners.length }))];

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    let visible = true;
    const update = () => { page.dataset.paused = String(document.hidden || !visible); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); });
    observer.observe(page); document.addEventListener('visibilitychange', update); update();
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); };
  }, []);

  const selectCategory = (key: string, showAll = false) => { setCategory(key); setExpanded(showAll); };
  const selectArchive = (key: string) => { setArchiveKey(key); setArchiveExpanded(false); };
  const stepArchive = (direction: number) => {
    const index = archives.findIndex(item => item.key === archive?.key);
    selectArchive(archives[(index + direction + archives.length) % archives.length].key);
  };

  return <div className="sponsors-page" ref={pageRef}>
    <div className="sponsor-atmosphere" aria-hidden="true" />
    <div className="sponsor-page-container">
      <header className="sponsor-hero">
        <motion.p className="sponsor-eyebrow" initial={false} animate={reduceMotion ? { opacity: 1 } : { opacity: [.7, 1], y: [6, 0] }}>RICORRENZA</motion.p>
        <div className="sponsor-hero-title"><Laurel /><h1>{settings?.page_title || 'Our Sponsors'}</h1><Laurel className="is-reversed" /></div>
        <p>{settings?.intro_text?.replace(/\bRICORRENZA\s+20\d{2}\b/gi, `RICORRENZA ${year}`) || 'The partners who make Ricorrenza happen.'}</p>
        <div className="sponsor-hero-ornament" aria-hidden="true"><span /><Crown strokeWidth={1.4} /><span /></div>
      </header>

      <nav className="sponsor-timeline" aria-label="Festival editions">
        {years.map(edition => {
          const editionArchive = archives.find(item => item.year === edition);
          const isCurrent = edition === year;
          return <button key={edition} type="button" className={isCurrent ? 'is-current' : ''} disabled={!isCurrent && !editionArchive} aria-label={isCurrent ? `${edition}, current edition` : `${edition}, ${editionArchive?.partners.length || 0} partners`} onClick={() => {
            if (isCurrent) document.getElementById(`current-partners-${id}`)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
            else { selectArchive(String(edition)); archiveRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); }
          }}><span className="sponsor-year-label">{edition}</span><span className="sponsor-year-diamond" aria-hidden="true" />{isCurrent ? <em>Current<br />edition</em> : <span className="sponsor-year-count">{editionArchive ? <><strong>{editionArchive.partners.length}</strong>Partners</> : <><strong>—</strong>Archive pending</>}</span>}</button>;
        })}
      </nav>

      <Reveal className="sponsor-current-shell">
        <section id={`current-partners-${id}`} aria-labelledby={`current-heading-${id}`} className="sponsor-current-section">
          <header className="sponsor-current-header">
            <div className="sponsor-edition-wordmark"><span>RICORRENZA</span><strong>{year}</strong></div>
            <h2 id={`current-heading-${id}`}>Our Current Partners</h2>
            <dl className="sponsor-stat-strip"><div><Users strokeWidth={1.4} aria-hidden="true" /><dt>Total partners</dt><dd>{current.length}</dd></div><div><LayersIcon aria-hidden="true" /><dt>Categories</dt><dd>{groups.length}</dd></div><div><CalendarDays strokeWidth={1.4} aria-hidden="true" /><dt>Current edition</dt><dd>{year}</dd></div></dl>
          </header>

          {loading && !partners.length ? <div className="sponsor-loading" role="status" aria-label="Loading partners">{[0, 1, 2].map(index => <div key={index}><span /><span /><span /></div>)}<span className="sr-only">Loading partners…</span></div>
            : error && !partners.length ? <div className="sponsor-empty" role="alert"><LayersIcon /><h3>Our partner list is taking a moment.</h3><p>Please try loading it again.</p><button className="sponsor-action" onClick={onRetry}><ReloadIcon />Try again</button></div>
              : !current.length ? <div className="sponsor-empty"><Crown strokeWidth={1.3} aria-hidden="true" /><p className="sponsor-eyebrow">THE NEXT CHAPTER</p><h3>Great partnerships are on the way.</h3><p>Our {year} partners will be revealed here. Until then, meet the brands that have been part of our story below.</p><button className="sponsor-action sponsor-action-secondary" onClick={() => openContact()}>Be part of this edition<ArrowRightIcon /></button></div>
                : <>
                  <div className="sponsor-category-filters" role="tablist" aria-label="Partner categories">
                    {filters.map((filter, index) => <button key={filter.key} type="button" role="tab" id={`${id}-filter-${index}`} aria-selected={activeCategory === filter.key} aria-controls={`${id}-partner-panel`} tabIndex={activeCategory === filter.key ? 0 : -1} data-tone={filter.tone || 'all'} onClick={() => selectCategory(filter.key)} onKeyDown={event => {
                      const next = event.key === 'ArrowRight' ? (index + 1) % filters.length : event.key === 'ArrowLeft' ? (index - 1 + filters.length) % filters.length : event.key === 'Home' ? 0 : event.key === 'End' ? filters.length - 1 : -1;
                      if (next < 0) return;
                      event.preventDefault(); selectCategory(filters[next].key); (event.currentTarget.parentElement?.children[next] as HTMLElement)?.focus();
                    }}>{activeCategory === filter.key && <motion.span className="sponsor-filter-active" layoutId={`${id}-active-category`} transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 330, damping: 30 }} />}{filter.tone ? <CategoryIcon tone={filter.tone} /> : <GridIcon />}<span>{filter.label} <small>({filter.count})</small></span></button>)}
                  </div>
                  <div role="tabpanel" id={`${id}-partner-panel`} aria-labelledby={`${id}-filter-${filters.findIndex(filter => filter.key === activeCategory)}`} tabIndex={0} className="sponsor-partner-panel">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div key={`${activeCategory}-${expanded}`} initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -7 }} transition={{ duration: reduceMotion ? 0 : .2 }}>
                        {expanded ? <><div className="sponsor-expanded-heading"><h3>{activeCategory === 'all' ? 'All partners' : `${activeGroups[0]?.label} partners`} <span>({filtered.length})</span></h3><button type="button" onClick={() => selectCategory('all')}>Back to categories</button></div><div className="sponsor-expanded-grid" data-partner-count={filtered.length}>{filtered.map(partner => <PartnerLogo key={partner.id} partner={partner} />)}</div></>
                          : <>
                            {titles.length > 0 && <div className="sponsor-title-partners"><div className="sponsor-title-label"><Crown strokeWidth={1.3} aria-hidden="true" /><h3>Our<br />Title Partners</h3></div><div className="sponsor-feature-grid">{titles.map(partner => <PartnerLogo key={partner.id} partner={partner} featured />)}</div></div>}
                            <div className="sponsor-category-rows">{activeGroups.map((group, index) => <Reveal key={group.key} delay={index * .035}><div className="sponsor-category-row" data-tone={group.tone}><div className="sponsor-row-label"><CategoryIcon tone={group.tone} /><h3>{group.label}<small>Partners <span>({group.partners.length})</span></small></h3></div><div className="sponsor-logo-rail" tabIndex={0} role="group" aria-label={`${group.label} partner logos`}>{group.partners.map(partner => <PartnerLogo key={partner.id} partner={partner} />)}</div><button className="sponsor-row-view" type="button" aria-label={`View all ${group.label} partners`} onClick={() => selectCategory(group.key, true)}><span>View all</span><ArrowRightIcon /></button></div></Reveal>)}</div>
                          </>}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  {!expanded && <button type="button" className="sponsor-action sponsor-view-everyone" onClick={() => setExpanded(true)}><GridIcon />View all {activeCategory === 'all' ? 'partners' : `${activeGroups[0]?.label} partners`} <span>({filtered.length})</span><ArrowRightIcon /></button>}
                  <p className="sponsor-results-status sr-only" role="status">{filtered.length} {activeCategory === 'all' ? '' : activeGroups[0]?.label} partners shown</p>
                </>}
        </section>
      </Reveal>

      <section className="sponsor-previous-section" ref={archiveRef} aria-labelledby={`previous-heading-${id}`}>
        <Reveal><SectionHeading id={`previous-heading-${id}`}>Our Previous Partners</SectionHeading><p className="sponsor-section-subtitle">A look at the brands that have supported Ricorrenza over the years.</p></Reveal>
        {archive ? <>
          <div className="sponsor-archive-tabs" role="tablist" aria-label="Previous partner editions">{archives.map((edition, index) => <button type="button" role="tab" key={edition.key} id={`${id}-archive-tab-${index}`} aria-selected={archive.key === edition.key} aria-controls={`${id}-archive-panel`} tabIndex={archive.key === edition.key ? 0 : -1} onClick={() => selectArchive(edition.key)} onKeyDown={event => {
            const next = event.key === 'ArrowRight' ? (index + 1) % archives.length : event.key === 'ArrowLeft' ? (index - 1 + archives.length) % archives.length : event.key === 'Home' ? 0 : event.key === 'End' ? archives.length - 1 : -1;
            if (next < 0) return;
            event.preventDefault(); selectArchive(archives[next].key); (event.currentTarget.parentElement?.children[next] as HTMLElement)?.focus();
          }}>{edition.label}</button>)}</div>
          <div className="sponsor-archive-carousel"><button type="button" className="sponsor-round-button" aria-label="Previous archive edition" disabled={archives.length < 2} onClick={() => stepArchive(-1)}><ChevronLeftIcon /></button>
            <div className="sponsor-archive-panel" id={`${id}-archive-panel`} role="tabpanel" aria-labelledby={`${id}-archive-tab-${archives.findIndex(item => item.key === archive.key)}`}>
              <AnimatePresence mode="wait" initial={false}><motion.div key={archive.key} className="sponsor-archive-content" initial={reduceMotion ? false : { opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: reduceMotion ? 0 : .25 }}>
                <div className="sponsor-archive-info"><div className="sponsor-archive-brand"><Laurel /><div><span>RICORRENZA</span><strong>{archive.year || 'Earlier'}{!archive.year && <small>editions</small>}</strong></div><Laurel className="is-reversed" /></div><div className="sponsor-archive-count"><Users strokeWidth={1.3} aria-hidden="true" /><strong>{archive.partners.length}</strong><span>{archive.partners.length === 1 ? 'Partner' : 'Partners'}</span></div><p>Part of our story.<br />Always part of Ricorrenza.</p></div>
                <div className="sponsor-archive-logos" data-partner-count={archive.partners.length}>{archive.partners.slice(0, archiveExpanded ? undefined : 12).map(partner => <PartnerLogo key={partner.id} partner={partner} />)}{archive.partners.length > 12 && !archiveExpanded && <button type="button" className="sponsor-archive-more" onClick={() => setArchiveExpanded(true)}>View all {archive.partners.length} partners<ArrowRightIcon /></button>}</div>
              </motion.div></AnimatePresence>
            </div><button type="button" className="sponsor-round-button" aria-label="Next archive edition" disabled={archives.length < 2} onClick={() => stepArchive(1)}><ChevronRightIcon /></button></div>
          {archives.length > 1 && <div className="sponsor-carousel-dots" aria-label="Choose archive edition">{archives.map(edition => <button key={edition.key} type="button" aria-label={`Show ${edition.label} partners`} aria-pressed={edition.key === archive.key} onClick={() => selectArchive(edition.key)} />)}</div>}
        </> : <div className="sponsor-archive-empty"><Handshake strokeWidth={1.4} aria-hidden="true" /><p>Every partnership becomes part of our story.</p><span>Our previous partners will be celebrated here.</span></div>}
      </section>

      <SponsorshipPackagesGrid packages={packages} year={year} brochureUrl={settings?.brochure_url} brochureTitle={settings?.brochure_title} onEnquire={openContact} />

      <Reveal className="sponsor-cta-wrap"><button type="button" className="sponsor-action sponsor-main-cta" onClick={() => openContact()}><Handshake strokeWidth={1.3} /><span>Become a Sponsor for Ricorrenza {year}</span><ArrowRightIcon /></button><p>Let's make the next chapter unforgettable.</p></Reveal>
    </div>
    <ContactDialog open={contactOpen} onClose={() => setContactOpen(false)} settings={settings} instagramUrl={instagramUrl} year={year} teamContacts={teamContacts} selectedTier={selectedTier} />
  </div>;
}
