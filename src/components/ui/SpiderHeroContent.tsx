import { resolveHomepageMedia, DEFAULT_HOME_VIDEO } from '../../utils/homepageMedia';
import { useEffect, useState } from 'react';
import type { HeroMediaV2 } from '../../services/heroMediaService';
import { LazyVideo } from './LazyVideo';
import { useData } from '../../context/DataContext';
import { BRAND_YEAR } from '../../constants/brand';
import { getPortalLogoUrl } from '../cinematic/portalLogoUrl';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { FestivalEnvironment } from './festival/FestivalEnvironment';
import { FestivalAtmosphere } from './festival/FestivalAtmosphere';
import { FestivalLiquidFlow } from './festival/FestivalLiquidFlow';
import { useFestivalSceneReadiness } from './festival/FestivalSceneReadiness';

export function SpiderHeroContent({ media, mobile = false }: { media?: HeroMediaV2 | null; mobile?: boolean }) {
  const { homepageSettings } = useData();
  const background = resolveHomepageMedia(media, mobile);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [background.src]);
  const showImage = background.kind === 'image';
  const configuredImage = background.src;
  const source = failed ? DEFAULT_HOME_VIDEO : background.src;
  const festivalBackdrop = failed || background.origin === 'default';
  const { setSettled } = useFestivalSceneReadiness();
  const usesFestivalScene = festivalBackdrop && media?.enabled !== false;
  useEffect(() => { if (!usesFestivalScene) setSettled(true); }, [usesFestivalScene, setSettled]);
  const poster = background.poster;
  const crop = { transform: `translate3d(${Number(media?.[mobile ? 'mobile_offset_x' : 'desktop_offset_x'] || 0) * 100}%, ${Number(media?.[mobile ? 'mobile_offset_y' : 'desktop_offset_y'] || 0) * 100}%, 0) scale(${Number(media?.[mobile ? 'mobile_zoom' : 'desktop_zoom']) || 1})` };
  return (
    <><section className="spider-hero" aria-labelledby="spider-hero-title">
      {media?.enabled !== false && !festivalBackdrop && (showImage ? <img className="spider-hero-video" style={crop} src={configuredImage} alt="" aria-hidden="true" onError={() => setFailed(true)} /> : <LazyVideo className="spider-hero-video" style={crop} src={source} poster={poster} muted loop playsInline aria-hidden="true" tabIndex={-1}
        onError={() => setFailed(true)} onCanPlay={event => { void event.currentTarget.play().catch(() => {}); }} />)}
      <div className="spider-hero-video-shade" aria-hidden="true" style={media?.overlay_color ? { background: media.overlay_color, opacity: media.overlay_opacity } : undefined} />
      {usesFestivalScene && <FestivalEnvironment logoUrl={getPortalLogoUrl(homepageSettings)} onSettled={setSettled} />}
      {media?.enabled !== false && <FestivalAtmosphere />}
      <div className="spider-hero-layout">
        <div className="spider-hero-copy">
          <p className="spider-hero-eyebrow">Annual festival <span aria-hidden="true">/</span> IQ City</p>
          <h1 id="spider-hero-title" className="spider-hero-title">{homepageSettings?.hero_title || 'RICORRENZA'}</h1>
          <div className="spider-hero-edition"><span>{homepageSettings?.brand_year || BRAND_YEAR}</span></div>
          <p className="spider-hero-subtitle">{homepageSettings?.hero_subtitle || 'Music That Moves You'}</p>
          <p className="spider-hero-description">{homepageSettings?.hero_description || 'Experience the future of music and creativity'}</p>
          <div className="spider-hero-actions"><Link to="/events" className="spider-hero-primary">Explore Events <ArrowRight size={23} /></Link><Link to="/schedule" className="spider-hero-secondary">View Schedule <ArrowRight size={23} /></Link></div>
        </div>
      </div>
    </section>
    {usesFestivalScene && <FestivalLiquidFlow />}</>
  );
}
