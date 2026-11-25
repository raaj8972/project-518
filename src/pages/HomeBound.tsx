import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ArrowTopRightIcon, ChevronLeftIcon, ChevronRightIcon, Cross2Icon, InstagramLogoIcon, PlayIcon } from '@radix-ui/react-icons';
import { useData } from '../context/DataContext';
import { AuditionModal } from '../components/AuditionModal';
import { HomeboundMemberCard } from '../components/HomeBound/HomeboundMemberCard';
import { SEO } from '../components/SEO';
import { useFestivalDialog } from '../hooks/useFestivalDialog';
import type { BandMember } from '../types/data';
import { getEnabledHomeboundMembers, getHomeboundSocialLinks, safeHomeboundUrl } from '../utils/homebound';
import { getHomeboundMemberCategory, readHomeboundContent, type HomeboundIcon } from '../utils/homeboundContent';
import '../styles/Homebound.css';

type Filter = string;
// React 18 forwards the browser's lowercase attribute without a warning.
const imagePriority = { fetchpriority: 'high' } as const;

function Heartbeat({ className = '' }: { className?: string }) {
  return <svg className={`hb-heartbeat ${className}`} viewBox="0 0 160 52" fill="none" aria-hidden="true"><path d="M0 27h53l5-6 6 17 6-29 6 40 7-47 7 39 7-24 6 16 5-6h52" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>;
}

function BrushStroke({ color = 'currentColor', className = '' }: { color?: string; className?: string }) {
  return <svg className={`hb-brush-stroke ${className}`} viewBox="0 0 380 35" fill="none" aria-hidden="true"><path d="M4 28C101 4 257-2 375 14 232 2 127 15 52 27c103-15 191-18 253-12" stroke={color} strokeWidth="4" /><path d="M143 28c62-10 153-13 214-6" stroke={color} strokeWidth="1.5" /></svg>;
}

function InstrumentIcon({ category }: { category: HomeboundIcon | 'all' }) {
  const paths: Record<HomeboundIcon | 'all', ReactNode> = {
    all: <><circle cx="15" cy="9" r="4" /><circle cx="5" cy="11" r="3" /><circle cx="25" cy="11" r="3" /><path d="M8 27v-6a7 7 0 0 1 14 0v6H8ZM2 25v-5a5 5 0 0 1 5-5m21 10v-5a5 5 0 0 0-5-5" /></>,
    vocals: <><rect x="12" y="2" width="8" height="15" rx="4" transform="rotate(32 16 10)" /><path d="m10 15-6 11m6-9 4 2M13 5l6 4m-8-1 6 4m-8-1 6 4" /></>,
    guitars: <><path d="m17 13 10-10 2 2-10 10c4 6 1 10-3 11-2 1-2 3-6 2-6-1-10-7-7-11 1-2 4-1 5-4 2-3 5-3 9 0Z" /><circle cx="12" cy="19" r="3" /><path d="m9 22 17-17M7 24l3 2m14-23 5 5" /></>,
    keys: <><path d="M2 7h26v18H2zM6 7v18m5-18v18m5-18v18m5-18v18m5-18v18" /><path d="M8 7v10m5-10v10m10-10v10" strokeWidth="3" /></>,
    drums: <><ellipse cx="10" cy="13" rx="8" ry="3" /><path d="M2 13v12c0 4 16 4 16 0V13m-12 3v10m8-10v10M20 10c0-3 9-3 9 0v12c0 2-5 3-8 1m4-11v10M5 3l18 5M25 2 8 8" /></>,
    beatbox: <><rect x="11" y="2" width="10" height="16" rx="5" /><path d="M7 12v2a9 9 0 0 0 18 0v-2M16 23v7m-5 0h10M1 11v8m3-5v2m24-5v8m3-5v2" /></>,
    music: <><path d="M12 23V7l16-4v16M12 12l16-4" /><ellipse cx="7" cy="25" rx="5" ry="4" /><ellipse cx="23" cy="21" rx="5" ry="4" /></>,
    crew: <><path d="M2 6h26M2 15h26M2 24h26" /><circle cx="9" cy="6" r="2" fill="currentColor" /><circle cx="21" cy="15" r="2" fill="currentColor" /><circle cx="12" cy="24" r="2" fill="currentColor" /></>,
  };
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[category]}</svg>;
}

function MemberProfile({ member, bandHeading, onClose }: { member: BandMember; bandHeading: string; onClose: () => void }) {
  const ref = useFestivalDialog(true, onClose);
  const socials = getHomeboundSocialLinks(member);
  return createPortal(<div className="hb-profile-layer" onClick={onClose}>
    <div ref={ref} className="hb-profile" role="dialog" aria-modal="true" aria-labelledby="hb-profile-name" tabIndex={-1} onClick={event => event.stopPropagation()} data-lenis-prevent>
      <button className="hb-profile__close" type="button" onClick={onClose} aria-label="Close member profile"><Cross2Icon /></button>
      {member.image && <img key={member.image} className="hb-profile__image" src={member.image} alt={member.name} onError={event => { event.currentTarget.hidden = true; }} />}
      <div className="hb-profile__content"><p className="hb-eyebrow">{bandHeading}</p><h2 id="hb-profile-name">{member.name}</h2><p className="hb-profile__role">{member.role}{member.specialty ? ` · ${member.specialty}` : ''}</p>
        {member.description && <p className="hb-profile__description">{member.description}</p>}
        {!!member.achievements?.length && <ul>{member.achievements.map((achievement, index) => <li key={index}>{achievement}</li>)}</ul>}
        <div className="hb-profile__socials">{Object.entries(socials).map(([name, url]) => url && <a key={name} href={url} target="_blank" rel="noopener noreferrer">{name}<ArrowTopRightIcon aria-hidden="true" /></a>)}</div>
      </div>
    </div>
  </div>, document.body);
}

function HomeboundTitle({ title, artwork, enabled }: { title: string; artwork: string; enabled: boolean }) {
  const [failed, setFailed] = useState<string | null>(null);
  const showArtwork = enabled && artwork && failed !== artwork;
  return <h1 id="homebound-title" className={`hb-title${showArtwork ? '' : ' hb-title--text'}`}>
    {showArtwork ? <><span className="sr-only">{title}</span><img className="hb-title__art" src={artwork} alt="" width="1800" height="600" {...imagePriority} onError={() => setFailed(artwork)} /></> : <span className="hb-title__text">{title}</span>}
  </h1>;
}

export const HomeBound = () => {
  const { bandMembers, formSettings, homeboundSettings, loading, isLoaded, connectionStatus, refreshAll } = useData();
  const [auditionOpen, setAuditionOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<BandMember | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(() => typeof window !== 'undefined' && window.innerWidth < 700 ? 2 : 4);
  const touchStart = useRef<number | null>(null);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 699px)');
    const update = () => { setPageSize(media.matches ? 2 : 4); setPage(0); };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const content = useMemo(() => readHomeboundContent(homeboundSettings?.page_content), [homeboundSettings?.page_content]);
  const members = useMemo(() => getEnabledHomeboundMembers(bandMembers || []), [bandMembers]);
  const categories = content.categories.filter(category => category.enabled);
  const filters: { id: string; label: string; icon: HomeboundIcon | 'all' }[] = [
    { id: 'all', label: content.all_label, icon: 'all' }, ...categories,
  ];
  const activeFilter = filter === 'all' || categories.some(category => category.id === filter) ? filter : 'all';
  useEffect(() => {
    if (filter !== 'all' && !content.categories.some(category => category.id === filter && category.enabled)) {
      setFilter('all');
      setPage(0);
    }
  }, [filter, content.categories]);
  const filtered = useMemo(() => activeFilter === 'all' ? members : members.filter(member => getHomeboundMemberCategory(member, content.categories) === activeFilter), [members, activeFilter, content.categories]);
  const pageCount = Math.ceil(filtered.length / pageSize);
  const currentPage = Math.min(page, Math.max(0, pageCount - 1));
  const visibleMembers = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const socialUrl = homeboundSettings?.instagram_enabled ? safeHomeboundUrl(homeboundSettings.instagram_url) : null;
  const musicUrl = members.map(member => { const links = getHomeboundSocialLinks(member); return links.youtube || links.spotify; }).find(Boolean);
  const pending = !members.length && (loading || !isLoaded);
  const disconnected = connectionStatus === 'offline' || connectionStatus === 'degraded';
  const chooseFilter = (value: Filter) => { setFilter(value); setPage(0); };
  const movePage = (direction: number) => setPage(Math.max(0, Math.min(pageCount - 1, currentPage + direction)));
  const filterInfo = filters.find(item => item.id === activeFilter)!;
  const aboutText = content.about_text.replace(/\{member_count\}/g, pending ? '—' : String(members.length));
  const currentMember = selectedMember ? members.find(member => member.id === selectedMember.id) : null;

  return <div className={`homebound-page${content.sections.hero ? '' : ' homebound-page--without-hero'}`}>
    <SEO title={`${content.hero_title} — The College Band`} description={aboutText.replace(/\s+/g, ' ').slice(0, 180)} canonical="https://ricorrenza.fun/home-bound" image={content.hero_image || undefined} />
    {content.sections.hero && <section className="hb-hero" aria-labelledby="homebound-title">
      {content.hero_image && <img key={content.hero_image} className="hb-hero__stage" src={content.hero_image} alt={content.hero_image_alt} width="1774" height="887" {...imagePriority} onError={event => { event.currentTarget.hidden = true; }} />}
      <div className="hb-hero__heading">
        <div className="hb-hero__title-row"><Heartbeat /><HomeboundTitle title={content.hero_title} artwork={content.hero_wordmark_image} enabled={content.hero_wordmark_enabled} /><Heartbeat /></div>
        <BrushStroke color="#ed1c17" className="hb-title-underline" />
        <p className="hb-hero__subtitle">{content.hero_subtitle}</p>
      </div>
      <span className="hb-drum-mark" aria-hidden="true">{content.hero_title}</span>
    </section>}

    {(content.sections.about || content.sections.band) && <div className="hb-content">
      {content.sections.about && <section className={`hb-about${content.about_image ? '' : ' hb-about--text-only'}`} aria-labelledby="homebound-about">
        {content.about_image && <div className="hb-about__photo">
          <span className="hb-about__back-sheet" aria-hidden="true" />
          <figure className="hb-about__polaroid"><img key={content.about_image} src={content.about_image} alt={content.about_image_alt} width="724" height="724" loading="lazy" onError={event => { event.currentTarget.hidden = true; }} /></figure>
          <span className="hb-pushpin" aria-hidden="true" /><span className="hb-guitar-pick" aria-hidden="true"><Heartbeat /></span>
        </div>}
        <div className="hb-about__copy"><h2 id="homebound-about" className="hb-paper-heading">{content.about_heading}</h2><p>{aboutText}</p><BrushStroke color="#efba3c" className="hb-about__scribble" /></div>
      </section>}

      {content.sections.band && <section className="hb-band" aria-labelledby="homebound-band">
        <div className="hb-band__heading">
          <div className="hb-section-title"><Heartbeat /><h2 id="homebound-band">{content.band_heading}</h2><Heartbeat /><BrushStroke color="#dfad32" /></div>
          <span className="hb-member-count"><strong>{pending ? '—' : members.length}</strong> {members.length === 1 ? 'member' : 'members'}</span>
        </div>
        <div className="hb-filters" role="group" aria-label="Filter band members">{filters.map(item => {
          const count = item.id === 'all' ? members.length : members.filter(member => getHomeboundMemberCategory(member, content.categories) === item.id).length;
          return <button key={item.id} type="button" aria-pressed={activeFilter === item.id} aria-controls="homebound-members" onClick={() => chooseFilter(item.id)}><InstrumentIcon category={item.icon} /><span>{item.label} ({count})</span></button>;
        })}</div>
        <p className="sr-only" role="status">{pending ? 'Loading the band' : `${filtered.length} ${activeFilter === 'all' ? '' : filterInfo.label.toLowerCase() + ' '}members. ${pageCount ? `Page ${currentPage + 1} of ${pageCount}.` : ''}`}</p>
        <div id="homebound-members" className="hb-members-grid" aria-busy={pending}
          onTouchStart={event => { touchStart.current = event.touches[0].clientX; }}
          onTouchEnd={event => { if (touchStart.current !== null) { const distance = touchStart.current - event.changedTouches[0].clientX; if (Math.abs(distance) > 50) movePage(distance > 0 ? 1 : -1); } touchStart.current = null; }}>
          {pending ? Array.from({ length: pageSize }, (_, index) => <div className="hb-member-skeleton" key={index}><span /><span /></div>) : visibleMembers.map((member, index) => <HomeboundMemberCard key={member.id} member={member} index={currentPage * pageSize + index} icon={content.categories.find(category => category.id === getHomeboundMemberCategory(member, content.categories))?.icon} onSelect={setSelectedMember} />)}
        </div>
        {!pending && !filtered.length && <div className="hb-empty">
          <InstrumentIcon category={filterInfo.icon} />
          <h3>{disconnected ? 'The band is a beat away.' : activeFilter === 'all' ? 'The lineup is coming together.' : 'More music is on the way.'}</h3>
          <p>{disconnected ? 'We couldn’t load the lineup. Please try again.' : activeFilter === 'all' ? 'Meet our musicians here as the lineup is announced.' : `Our ${filterInfo.label.toLowerCase()} lineup will appear here once announced.`}</p>
          {disconnected ? <button type="button" onClick={() => refreshAll()}>Try again</button> : activeFilter !== 'all' && <button type="button" onClick={() => chooseFilter('all')}>Meet the whole band</button>}
        </div>}
        {pageCount > 1 && <nav className="hb-pagination" aria-label="Band member pages">
          <button type="button" className="hb-pagination__arrow" disabled={currentPage === 0} onClick={() => movePage(-1)} aria-label="Previous band members"><ChevronLeftIcon /></button>
          <div className="hb-pagination__dots">{Array.from({ length: pageCount }, (_, index) => <button key={index} type="button" aria-label={`Band members page ${index + 1}`} aria-current={index === currentPage ? 'page' : undefined} onClick={() => setPage(index)} />)}</div>
          <button type="button" className="hb-pagination__arrow" disabled={currentPage === pageCount - 1} onClick={() => movePage(1)} aria-label="Next band members"><ChevronRightIcon /></button>
        </nav>}
      </section>}
    </div>}

    {content.sections.journey && <section className="hb-journey" aria-labelledby="homebound-journey"><div className="hb-journey__inner">
      <div className="hb-journey__heading"><span className="hb-red-tape" aria-hidden="true" /><h2 id="homebound-journey">{content.journey_heading}</h2><BrushStroke color="#ba251a" /></div>
      <div className="hb-journey__timeline" aria-hidden="true" />
      {content.journey_items.filter(item => item.enabled).map(item => <figure className="hb-journey__polaroid" key={item.id}>
        {item.image && <img key={item.image} src={item.image} alt={item.image_alt} width="724" height="724" loading="lazy" onError={event => { event.currentTarget.hidden = true; }} />}
        <figcaption><strong>{item.title}</strong><span>{item.subtitle}</span></figcaption>
      </figure>)}
    </div></section>}

    {content.sections.encore && (socialUrl || musicUrl || formSettings?.audition_form_enabled) && <section className="hb-encore" aria-label="Connect with Homebound">
      <p>{content.encore_text}</p><div>
        {musicUrl && <a href={musicUrl} target="_blank" rel="noopener noreferrer"><PlayIcon aria-hidden="true" />{content.listen_label}</a>}
        {socialUrl && <a href={socialUrl} target="_blank" rel="noopener noreferrer"><InstagramLogoIcon aria-hidden="true" />{content.follow_label}</a>}
        {formSettings?.audition_form_enabled && <button type="button" onClick={() => setAuditionOpen(true)}>{content.audition_label}<ArrowTopRightIcon aria-hidden="true" /></button>}
      </div>
    </section>}
    {content.sections.footer && <div className="hb-page-credit"><span>{content.footer_text}</span><span>{content.footer_subtitle}</span>{content.gallery_url && content.gallery_label && <Link to={content.gallery_url}>{content.gallery_label}<ArrowTopRightIcon aria-hidden="true" /></Link>}</div>}
    {currentMember && <MemberProfile member={currentMember} bandHeading={content.band_heading} onClose={() => setSelectedMember(null)} />}
    {formSettings?.audition_form_enabled && <AuditionModal isOpen={auditionOpen} onClose={() => setAuditionOpen(false)} />}
  </div>;
};

export default HomeBound;
