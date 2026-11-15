import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Cross1Icon, HeartFilledIcon, LightningBoltIcon } from '@radix-ui/react-icons';
import AutoCarousel from '../AutoCarousel';
import { useTopStars, type TopStarProfile } from '../../hooks/useTopStars';
import { FestivalCrown, FestivalLaurel, FestivalSectionHeading } from './FestivalSectionHeading';
import '../../styles/FestivalSections.css';
import '../../styles/FestivalSpotlight.css';

function StarPortrait({ profile }: { profile: TopStarProfile }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [profile.avatar_url]);
  const initials = profile.full_name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  return <div className="rico-star-portrait">
    {profile.avatar_url && !failed ? <img src={profile.avatar_url} alt={profile.full_name} loading="lazy" decoding="async" onError={() => setFailed(true)} /> : <span className="rico-star-monogram" aria-label={profile.full_name}>{initials || 'R'}</span>}
  </div>;
}

function StarStats({ profile }: { profile: TopStarProfile }) {
  return <div className="rico-star-metrics"><div><span>XP Power</span><strong>{profile.xp.toLocaleString()}</strong></div><div><span>Hearts</span><strong><HeartFilledIcon aria-hidden="true" />{profile.likes_count.toLocaleString()}</strong></div></div>;
}

export default function TopLegendsSection() {
  const { stars: legends, loading, error, refetch } = useTopStars(5);
  const reducedMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [selectedProfile, setSelectedProfile] = useState<TopStarProfile | null>(null);
  useEffect(() => {
    if (!selectedProfile) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedProfile(null);
      const dialog = dialogRef.current;
      if (event.key !== 'Tab' || !dialog) return;
      const controls = dialog.querySelectorAll<HTMLElement>('a[href], button, [tabindex="0"]');
      const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); previous?.focus(); };
  }, [selectedProfile]);

  return <section id="rico-stars" className="festival-stars festival-spotlight" aria-labelledby="rico-stars-title">
    <div className="festival-spotlight-content">
      <FestivalSectionHeading kind="stars" />
      {loading ? <div className="festival-ranking-loading" role="status" aria-label="Loading live rankings">{[0, 1, 2].map(index => <div key={index} className="festival-ranking-skeleton" aria-hidden="true"><div /><span /><span /></div>)}</div>
        : error ? <div className="festival-ranking-empty" role="status"><FestivalCrown /><p>{error}</p><button type="button" onClick={() => void refetch()}>Try again</button></div>
        : !legends.length ? <div className="festival-ranking-empty"><FestivalCrown /><h3>Your moment is coming</h3><p>Student rankings will appear as the festival gets underway.</p><a href="/events">Explore the events</a></div>
        : <AutoCarousel intervalMs={5000} paused={!!selectedProfile || !!reducedMotion} pauseOnHover showArrows showDots showPause stopOnInteraction itemNavigation ariaLabel="Rico Stars rankings" className="festival-spotlight-deck festival-star-deck">
          {legends.map(legend => <div key={legend.id} className="rico-star-slot">
            <button type="button" className="rico-star-panel" data-rank={legend.rank} data-spider-web onClick={() => setSelectedProfile(legend)} aria-label={`View ${legend.full_name}, rank ${legend.rank}`} style={{ ...(legend.background_url ? { '--rico-profile-background': `url(${JSON.stringify(legend.background_url)})` } : {}), ...(legend.aura_color ? { '--rico-profile-aura': legend.aura_color } : {}) } as CSSProperties}>
              <span className="rico-star-rank">Rank #{legend.rank}</span>
              <div className="rico-star-portrait-wrap"><StarPortrait profile={legend} /><span className="rico-star-crown"><FestivalCrown /></span></div>
              <div className="rico-star-name-row">{legend.rank === 1 && <FestivalLaurel />}<h3>{legend.full_name}</h3>{legend.rank === 1 && <FestivalLaurel />}</div>
              <p className="rico-star-label">Rico Star</p>
              <StarStats profile={legend} />
            </button>
          </div>)}
        </AutoCarousel>}
    </div>
    {createPortal(<AnimatePresence>{selectedProfile && <div className="rico-star-modal-layer">
      <motion.div className="rico-star-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedProfile(null)} />
      <motion.div ref={dialogRef} className="rico-star-modal" role="dialog" aria-modal="true" aria-labelledby="rico-star-profile-title" tabIndex={-1} initial={{ opacity: 0, y: reducedMotion ? 0 : 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
        <button className="rico-star-modal-close" type="button" aria-label="Close student profile" onClick={() => setSelectedProfile(null)}><Cross1Icon /></button>
        <p className="rico-star-modal-rank"><FestivalCrown />Rank #{selectedProfile.rank} · Rico Star</p>
        <StarPortrait profile={selectedProfile} />
        <h2 id="rico-star-profile-title">{selectedProfile.full_name}</h2>
        {selectedProfile.batch && <p className="rico-star-modal-batch">{selectedProfile.batch}</p>}
        <StarStats profile={selectedProfile} />
        <a className="rico-star-modal-join" href="/student/login"><LightningBoltIcon aria-hidden="true" />Join the Hype</a>
      </motion.div>
    </div>}</AnimatePresence>, document.body)}
  </section>;
}
