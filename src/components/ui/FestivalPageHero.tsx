import { useEffect, useState } from 'react';
import { heroMediaService, type HeroMediaV2 } from '../../services/heroMediaService';
import { resolveHomepageMedia } from '../../utils/homepageMedia';
import { BRAND_YEAR } from '../../constants/brand';
import { LazyVideo } from './LazyVideo';

/** A shared material and motion language for the festival's inner pages. */
export function FestivalPageHero({ title, description, pageKey }: { title: string; description: string; pageKey: string }) {
  const [media, setMedia] = useState<HeroMediaV2 | null>(null);
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [failed, setFailed] = useState(false);
  useEffect(() => heroMediaService.subscribeHeroMedia(pageKey, setMedia), [pageKey]);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const update = () => setMobile(query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const background = resolveHomepageMedia(media, mobile);
  useEffect(() => setFailed(false), [background.src]);
  const builtIn = background.origin === 'default' || failed;
  const crop = { transform: `translate3d(${Number(media?.[mobile ? 'mobile_offset_x' : 'desktop_offset_x'] || 0) * 100}%, ${Number(media?.[mobile ? 'mobile_offset_y' : 'desktop_offset_y'] || 0) * 100}%, 0) scale(${Number(media?.[mobile ? 'mobile_zoom' : 'desktop_zoom']) || 1})` };
  return <header className="festival-page-hero">
    {media?.enabled !== false && (builtIn
      ? <img src="/images/ricorrenza-emerald-city.webp" className="festival-page-hero-media" alt="" aria-hidden="true" />
      : background.kind === 'image'
        ? <img src={background.src} className="festival-page-hero-media" style={crop} alt="" aria-hidden="true" onError={() => setFailed(true)} />
        : <LazyVideo src={background.src} poster={background.poster} className="festival-page-hero-media" style={crop} muted loop playsInline aria-hidden="true" tabIndex={-1} onError={() => setFailed(true)} />)}
    <div className="festival-page-hero-copy">
      <p className="spider-hero-eyebrow">Ricorrenza {BRAND_YEAR} <span aria-hidden="true">/</span> IQ City</p>
      <h1>{title}</h1>
      <p>{description}</p>
      <span className="festival-page-hero-line" aria-hidden="true" />
    </div>
  </header>;
}
