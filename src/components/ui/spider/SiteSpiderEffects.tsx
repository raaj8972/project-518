import { isFestivalRoute, isPortalRoute } from '../../../utils/portalRoutes';
import { SiteSpider } from './SiteSpider';
import { SpiderOpening } from './SpiderOpening';
import { useFestivalSceneReadiness } from '../festival/FestivalSceneReadiness';
import { useCinematicIntroActive, useStaticExperience } from '../../../hooks/useStaticExperience';

/** Students share the festival scene; staff portals never mount its effects. */
export function SiteSpiderEffects({ pathname, theme, isReady }: { pathname: string; theme: string; isReady: boolean }) {
  const { pending } = useFestivalSceneReadiness();
  const staticExperience = useStaticExperience();
  const introActive = useCinematicIntroActive();
  // The band's concert artwork has its own visual treatment.
  if (pathname === '/home-bound' || pathname.startsWith('/home-bound/')) return null;
  if (staticExperience || !isFestivalRoute(pathname) || theme !== 'spiderman') return null;
  return <>{!isPortalRoute(pathname) && <SpiderOpening pathname={pathname} loading={!isReady || pending} />}{!introActive && <SiteSpider />}</>;
}
