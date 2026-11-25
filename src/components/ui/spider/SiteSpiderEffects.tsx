import { isFestivalRoute, isPortalRoute } from '../../../utils/portalRoutes';
import { SiteSpider } from './SiteSpider';
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
  // Public entry now belongs to the cinematic title; the roaming spider waits
  // until the app and festival scene are ready. Student portals keep their flow.
  if (!isPortalRoute(pathname) && (!isReady || pending)) return null;
  return !introActive ? <SiteSpider /> : null;
}
