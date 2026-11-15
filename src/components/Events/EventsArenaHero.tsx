import { useEffect, useRef, useState } from 'react';
import { ArrowDownIcon } from '@radix-ui/react-icons';
import { heroMediaService, type HeroMediaV2 } from '../../services/heroMediaService';
import { resolveHomepageMedia } from '../../utils/homepageMedia';
import { LazyVideo } from '../ui/LazyVideo';
import { BRAND_YEAR } from '../../constants/brand';
import { EventsHeroCharacter } from './EventsHeroCharacter';
import { EventsHeroForeground } from './EventsHeroForeground';

export function EventsArenaHero() {
  const heroRef = useRef<HTMLElement>(null);
  const [media, setMedia] = useState<HeroMediaV2 | null>(null);
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  const [failed, setFailed] = useState(false);
  useEffect(() => heroMediaService.subscribeHeroMedia('events', setMedia), []);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const update = () => setMobile(query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const background = resolveHomepageMedia(media, mobile);
  useEffect(() => setFailed(false), [background.src]);
  const custom = background.origin !== 'default' && !failed;
  const device = mobile ? 'mobile' : 'desktop';
  const crop = { transform: `translate(${Number(media?.[`${device}_offset_x`] || 0) * 100}%, ${Number(media?.[`${device}_offset_y`] || 0) * 100}%) scale(${Number(media?.[`${device}_zoom`]) || 1})` };
  return <header ref={heroRef} className="arena-hero">
    {media?.enabled !== false && <div className="arena-hero-art" aria-hidden="true">
      {custom && background.kind === 'video'
        ? <LazyVideo className="arena-hero-image" src={background.src} poster={background.poster} style={crop} muted playsInline loop onError={() => setFailed(true)} />
        : <img className="arena-hero-image" src={custom ? background.src : '/images/ricorrenza-emerald-city.webp'} style={custom ? crop : undefined} alt="" fetchPriority="high" onError={() => setFailed(true)} />}
      {custom && <span className="arena-hero-custom-overlay" style={{ backgroundColor: media?.overlay_color || '#07130d', opacity: media?.overlay_opacity ?? 0.35 }} />}
      <span className="arena-hero-art-shade" />
    </div>}
    {media?.enabled !== false && <><EventsHeroCharacter /><EventsHeroForeground heroRef={heroRef} /></>}
    <div className="arena-hero-copy">
      <p className="arena-eyebrow">Ricorrenza {BRAND_YEAR} <span /> IQ City Medical College</p>
      <div className="arena-title-rule" aria-hidden="true"><i /><span>THE ARENA AWAITS</span><i /></div>
      <h1>EVENTS</h1>
      <p className="arena-hero-subtitle">CHOOSE YOUR ARENA</p>
      <p className="arena-hero-description">One fest. Every kind of extraordinary.<br />Find your stage. Make it yours.</p>
      <a className="arena-explore" href="#event-arena">Explore the events <ArrowDownIcon /></a>
    </div>
    <span className="arena-hero-bottom-rule" aria-hidden="true" />
  </header>;
}
