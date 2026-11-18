import { Component, lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { normalizedProgress, smoothRange } from './cinematicMotion';
import { CLOUD_HOLD_MS, createScrollVideoController, HOME_FADE_MS } from './scrollVideo';
import { cloudEntryPose, introAssets, introFlow } from './introFlow';
import VideoCloudTransition from './VideoCloudTransition';
import { useCoreData } from '../../context/CoreDataContext';
import { getPortalLogoUrl } from './portalLogoUrl';
import { getIntroPolicy, INTRO_LIMITS, publishIntroPhase, rememberIntroFallback, savedIntroFallback, supportsCinematicIntro, visibleTimeout } from './introCapability';
import { canLookAround, createInlineLook } from './inlineLook';
import { canPlayDocumentIntro, markDocumentIntroPlayed } from './documentIntro';
import { INTRO_PORTAL_ENABLED } from './introConfig';
import './CinematicIntro.css';
const CinematicScene = lazy(() => import('./CinematicScene'));
class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error('[Cinematic scene]', error); this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

const reducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Scroll-scrubbed film; the real homepage remains mounted below the runway. */
export default function CinematicHome({ children, portalEnabled = INTRO_PORTAL_ENABLED }: { children: ReactNode; portalEnabled?: boolean }) {
  const { homepageSettings } = useCoreData();
  const portalLogoUrl = getPortalLogoUrl(homepageSettings);
  const [policy] = useState(() => getIntroPolicy(navigator, window.innerWidth));
  const { mobile, quality } = policy;
  const assets = introAssets(mobile);
  const [initialEntry] = useState(() => canPlayDocumentIntro('cinematic'));
  const sceneProgress = useRef({ current: 0 }).current;
  const sceneInvalidate = useRef<(() => void) | null>(null), sceneReady = useRef(false);
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const [sceneMounted, setSceneMounted] = useState(false);
  const [capable, setCapable] = useState(false), capabilityReady = useRef(false);
  const [waitingForTransition, setWaitingForTransition] = useState(false);
  const sceneHost = useRef<HTMLDivElement>(null), videoHost = useRef<HTMLDivElement>(null), wash = useRef<HTMLDivElement>(null);
  const [bypassReason, setBypassReason] = useState(() => !initialEntry ? 'navigation' : reducedMotion() ? 'reduced-motion' : window.location.hash ? 'deep-link' : new URLSearchParams(window.location.search).get('intro') === 'off' ? 'disabled' : policy.reason || savedIntroFallback());
  const [ready, setReady] = useState(false), [buffered, setBuffered] = useState(0);
  const root = useRef<HTMLDivElement>(null), runway = useRef<HTMLDivElement>(null), home = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null), video = useRef<HTMLVideoElement>(null);
  const cloudDraw = useRef<(() => void) | null>(null);
  const track = useRef<HTMLDivElement>(null), meter = useRef<HTMLSpanElement>(null), hint = useRef<HTMLDivElement>(null);
  const lookHint = useRef<HTMLDivElement>(null), look = useRef({ yaw: 0 }).current;
  const scrubber = useRef<ReturnType<typeof createScrollVideoController> | null>(null);
  const progress = useRef(0), endpoint = useRef(0), updateVisual = useRef<() => void>(() => {});
  const mediaProgress = useRef({ current: 0 }).current;
  const cloudLoaded = useRef(false), cloudHeld = useRef(false), cloudTimer = useRef<ReturnType<typeof setTimeout>>();
  const finishTimer = useRef<ReturnType<typeof setTimeout>>(), complete = useRef(false);
  const resetAfterBypass = useRef(false);
  const enabled = !bypassReason;

  useEffect(() => { if (initialEntry) markDocumentIntroPlayed('cinematic'); }, [initialEntry]);

  const openHome = useCallback((reason: string, remember = true) => {
    if (remember) rememberIntroFallback(reason);
    resetAfterBypass.current = true;
    setBypassReason(reason);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    const cancelTimeout = visibleTimeout(() => openHome('capability-timeout'), INTRO_LIMITS.probe);
    void supportsCinematicIntro(mobile, portalEnabled).then(supported => {
      if (disposed) return;
      cancelTimeout();
      if (!supported) { openHome('unsupported-device'); return; }
      capabilityReady.current = true; setCapable(true); updateVisual.current();
    }).catch(() => { if (!disposed) openHome('capability-failed'); });
    return () => { disposed = true; cancelTimeout(); };
  }, [enabled, mobile, portalEnabled, openHome]);

  const releaseHome = useCallback(() => {
    complete.current = true;
    if (overlay.current) { overlay.current.style.visibility = 'hidden'; overlay.current.style.pointerEvents = 'none'; }
    if (home.current) { home.current.inert = false; home.current.removeAttribute('aria-hidden'); }
  }, []);

  const onSceneReady = useCallback(() => { sceneReady.current = true; setSceneLoaded(true); updateVisual.current(); }, []);
  const onSceneFailure = useCallback(() => openHome('scene-failed'), [openHome]);
  const registerInvalidate = useCallback((fn: (() => void) | null) => { sceneInvalidate.current = fn; }, []);
  const registerCloudDraw = useCallback((fn: (() => void) | null) => { cloudDraw.current = fn; }, []);
  const onCloudReady = useCallback(() => { cloudLoaded.current = true; updateVisual.current(); }, []);
  const onCloudFailure = useCallback(() => openHome('cloud-failed'), [openHome]);
  useEffect(() => {
    if (!enabled || !portalEnabled || !overlay.current) return;
    return createInlineLook(overlay.current, { progress, look, invalidate: () => sceneInvalidate.current?.() });
  }, [enabled, portalEnabled, look]);
  useEffect(() => {
    if (!enabled || !sceneMounted || sceneLoaded) return;
    return visibleTimeout(() => { if (!sceneReady.current) openHome('scene-timeout'); }, INTRO_LIMITS.sceneStart);
  }, [enabled, sceneMounted, sceneLoaded, openHome]);
  useEffect(() => {
    if (!enabled || !waitingForTransition) return;
    return visibleTimeout(() => openHome('transition-timeout'), INTRO_LIMITS.transition);
  }, [enabled, waitingForTransition, openHome]);
  useEffect(() => {
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const change = () => { if (preference?.matches) openHome('reduced-motion', false); };
    preference?.addEventListener?.('change', change);
    return () => preference?.removeEventListener?.('change', change);
  }, [openHome]);
  useEffect(() => {
    if (!enabled) return;
    const connection = (navigator as Navigator & { connection?: EventTarget }).connection;
    const change = () => { const reason = getIntroPolicy(navigator, window.innerWidth).reason; if (reason) openHome(reason); };
    connection?.addEventListener?.('change', change); window.addEventListener('offline', change);
    return () => { connection?.removeEventListener?.('change', change); window.removeEventListener('offline', change); };
  }, [enabled, openHome]);

  useEffect(() => {
    const element = video.current;
    if (!enabled || !capable || !element) return;
    setReady(false);
    const controller = createScrollVideoController(element, { onReady: () => setReady(true), onBuffer: setBuffered, onFailure: () => openHome('video-failed'), cutoff: mobile ? 17.75 : undefined });
    scrubber.current = controller;
    controller.seek(mediaProgress.current);
    element.preload = 'auto'; element.src = assets.video; element.load();
    return () => {
      scrubber.current = null; controller.dispose();
      element.removeAttribute('src'); element.load();
    };
  }, [enabled, capable, assets.video, mobile, openHome, mediaProgress]);

  useEffect(() => {
    if (!enabled || !capable || ready) return;
    return visibleTimeout(() => openHome('video-timeout'), INTRO_LIMITS.videoStart);
  }, [enabled, capable, ready, openHome]);

  useLayoutEffect(() => {
    if (!enabled) {
      if (resetAfterBypass.current) {
        resetAfterBypass.current = false;
        window.dispatchEvent(new CustomEvent('rico:scroll-to', { detail: { top: 0 } }));
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
        home.current?.focus({ preventScroll: true });
      }
      return;
    }
    let disposed = false, cleanup = () => {};
    const host = root.current!, page = home.current!, spacer = runway.current!, film = overlay.current!;
    publishIntroPhase('active');
    page.inert = true; page.setAttribute('aria-hidden', 'true');
    let mountedScene = false;
    const apply = () => {
      if (disposed) return;
      let p = progress.current;
      // Without the portal, end at the original cloud transition instead of
      // leaving the removed chapter's empty scroll distance behind.
      const timelineEnd = portalEnabled ? 1 : .65;
      let phase = p * timelineEnd;
      const sceneAvailable = !portalEnabled || sceneReady.current;
      if (portalEnabled && capabilityReady.current && phase >= .36 && !mountedScene && !complete.current) { mountedScene = true; setSceneMounted(true); }
      setWaitingForTransition(phase >= .48 && (!cloudLoaded.current || !sceneAvailable) && !complete.current);
      const showingClouds = phase >= .55;
      if (!showingClouds) { clearTimeout(cloudTimer.current); cloudTimer.current = undefined; cloudHeld.current = false; }
      else if (cloudLoaded.current && !cloudHeld.current && !cloudTimer.current) {
        cloudTimer.current = setTimeout(() => { cloudTimer.current = undefined; cloudHeld.current = true; apply(); }, CLOUD_HOLD_MS);
      }
      if (phase > .59 && (!sceneAvailable || !cloudHeld.current) && !complete.current) {
        const start = host.getBoundingClientRect().top + window.scrollY;
        const checkpoint = start + spacer.offsetHeight * (.58 / timelineEnd);
        window.dispatchEvent(new CustomEvent('rico:scroll-to', { detail: { top: checkpoint } }));
        window.scrollTo({ top: checkpoint, behavior: 'instant' as ScrollBehavior });
        phase = .58; p = phase / timelineEnd; progress.current = p;
      }
      mediaProgress.current = phase;
      const flow = introFlow(phase);
      const cloudPose = cloudEntryPose(phase);
      if (video.current) video.current.style.transform = `translate3d(0,${cloudPose.rise}%,0) scale(${cloudPose.scale})`;
      const looking = portalEnabled && canLookAround(p);
      film.dataset.lookActive = String(looking);
      if (lookHint.current) lookHint.current.hidden = !looking;
      if (hint.current) { hint.current.style.removeProperty('visibility'); hint.current.hidden = looking; }
      sceneProgress.current = flow.scene;
      if (sceneHost.current) sceneHost.current.style.opacity = p >= .55 ? '1' : '0';
      if (videoHost.current) videoHost.current.style.visibility = !portalEnabled || flow.videoVisible || !cloudLoaded.current ? 'visible' : 'hidden';
      if (wash.current) wash.current.style.opacity = String(smoothRange(.78, .845, flow.scene) * (1 - smoothRange(.86, .94, flow.scene)) * .88);
      if (!document.hidden && p >= .55 && p < 1) sceneInvalidate.current?.();
      const handoff = (cloudHeld.current && sceneAvailable) || complete.current ? smoothRange(portalEnabled ? .94 : .59, timelineEnd, phase) : 0;
      const ending = p >= 1 && handoff === 1;
      if (!ending) { clearTimeout(finishTimer.current); finishTimer.current = undefined; complete.current = false; }
      // A large flick can cross the whole runway. Land at the actual hero's top
      // while the clouds still cover the page, rather than revealing its footer.
      if (ending && !complete.current && !finishTimer.current && window.scrollY > endpoint.current + 8) {
        window.dispatchEvent(new CustomEvent('rico:scroll-to', { detail: { top: endpoint.current } }));
        window.scrollTo({ top: endpoint.current, behavior: 'instant' as ScrollBehavior });
      }
      film.style.transition = ending ? `opacity ${HOME_FADE_MS}ms ease-out` : '';
      film.style.opacity = String(1 - handoff);
      film.style.visibility = complete.current ? 'hidden' : 'visible';
      film.style.pointerEvents = complete.current ? 'none' : 'auto';
      cloudDraw.current?.();
      const revealing = p >= .89 && p < 1;
      page.style.transform = revealing ? `translate3d(0,${Math.min(0, window.scrollY - endpoint.current)}px,0)` : '';
      page.style.opacity = revealing ? String(handoff) : '';
      page.inert = !complete.current;
      if (complete.current) page.removeAttribute('aria-hidden'); else page.setAttribute('aria-hidden', 'true');
      publishIntroPhase(p < .94 || handoff === 0 ? 'active' : window.scrollY < endpoint.current + window.innerHeight * .85 ? 'handoff' : 'complete');
      if (track.current) track.current.style.transform = `scaleX(${p})`;
      if (meter.current) meter.current.textContent = `${Math.round(p * 100)}%`;
      if (hint.current) hint.current.style.opacity = String(1 - smoothRange(.84, .9, p));
      if (ending && !complete.current && !finishTimer.current) {
        finishTimer.current = setTimeout(() => { finishTimer.current = undefined; releaseHome(); }, HOME_FADE_MS);
      }
      scrubber.current?.seek(phase);
    };
    updateVisual.current = apply;
    const afterIntroScroll = () => {
      if (complete.current && progress.current >= 1) publishIntroPhase(window.scrollY < endpoint.current + window.innerHeight * .85 ? 'handoff' : 'complete');
    };
    window.addEventListener('scroll', afterIntroScroll, { passive: true });
    const update = (p: number, start: number, distance: number) => { progress.current = p; endpoint.current = start + distance; apply(); };
    void Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([{ default: gsap }, { ScrollTrigger }]) => {
      if (disposed) return;
      gsap.registerPlugin(ScrollTrigger);
      const trigger = ScrollTrigger.create({ trigger: host, start: 'top top', end: () => `+=${spacer.offsetHeight}`, invalidateOnRefresh: true,
        onUpdate: self => update(self.progress, self.start, self.end - self.start),
        onRefresh: self => update(normalizedProgress(window.scrollY, self.start, self.end - self.start), self.start, self.end - self.start),
      });
      const refresh = () => trigger.refresh();
      let observer: ResizeObserver | undefined;
      cleanup = () => { observer?.disconnect(); window.removeEventListener('resize', refresh); trigger.kill(); };
      if (typeof ResizeObserver !== 'undefined') { observer = new ResizeObserver(refresh); observer.observe(spacer); }
      else window.addEventListener('resize', refresh);
      update(trigger.progress, trigger.start, trigger.end - trigger.start);
    }).catch(() => { if (!disposed) openHome('scroll-failed'); });
    return () => {
      disposed = true; cleanup(); window.removeEventListener('scroll', afterIntroScroll); clearTimeout(cloudTimer.current); clearTimeout(finishTimer.current);
      cloudTimer.current = undefined; finishTimer.current = undefined; cloudHeld.current = false;
      updateVisual.current = () => {};
      page.style.transform = ''; page.style.opacity = ''; page.inert = false; page.removeAttribute('aria-hidden');
      publishIntroPhase();
    };
  }, [enabled, releaseHome, openHome, portalEnabled, mediaProgress]);

  const skip = () => openHome('skipped', false);
  return <div ref={root} className="cinematic-experience cinematic-video-experience" data-cinematic-experience data-intro-mode={enabled ? portalEnabled ? 'video-3d' : 'video' : 'direct'} data-intro-portal={portalEnabled} data-intro-bypass={bypassReason} data-video-device={mobile ? 'mobile' : 'desktop'}>
    {enabled && <>
      <div ref={runway} className="cinematic-runway" aria-hidden="true" />
      <div ref={overlay} className="cinematic-overlay cinematic-video-overlay" data-cinematic-overlay role="region" tabIndex={0} aria-label={portalEnabled ? 'Ricorrenza scroll film introduction. In the 3D hall, drag left or right to look around the character. Scroll vertically to move forward.' : 'Ricorrenza scroll film introduction. Scroll to enter the festival.'}>
        {portalEnabled && <div ref={sceneHost} className="cinematic-scene-stage" data-scene-state={sceneLoaded ? 'ready' : 'loading'} aria-hidden="true">
          {sceneMounted && <SceneBoundary onFailure={onSceneFailure}><Suspense fallback={null}><CinematicScene variant="portal" look={look} logoUrl={portalLogoUrl} progress={sceneProgress} quality={quality} onReady={onSceneReady} onFailure={onSceneFailure} registerInvalidate={registerInvalidate} /></Suspense></SceneBoundary>}
        </div>}
        <div ref={videoHost} className="cinematic-film-stage">
        <div className="cinematic-video-ambience" style={{ backgroundImage: `url(${assets.poster})` }} aria-hidden="true" />
        <video ref={video} className="cinematic-scroll-video" data-scroll-video poster={assets.poster} muted playsInline preload="none" controls={false} disablePictureInPicture disableRemotePlayback aria-hidden="true" />
        </div>
        {portalEnabled && <div ref={wash} className="cinematic-portal-wash" aria-hidden="true" />}
        {capable && <VideoCloudTransition video={video} progress={mediaProgress} mobile={mobile} onReady={onCloudReady} onFailure={onCloudFailure} registerDraw={registerCloudDraw} />}
        <div className="cinematic-video-shade" aria-hidden="true" />
        <button type="button" onClick={skip} className="cinematic-skip cinematic-video-skip">Skip intro <span aria-hidden="true">↗</span></button>
        {!ready && <div className="cinematic-video-loading" role="status" aria-live="polite"><span className="cinematic-video-spinner" aria-hidden="true" /><span>Preparing the film{buffered > 0 ? ` · ${buffered}%` : '…'}</span></div>}
        {sceneMounted && !sceneLoaded && progress.current >= .55 && <div className="cinematic-video-loading" role="status">Opening the 3D realm…</div>}
        <div ref={hint} className="cinematic-video-scroll"><span aria-hidden="true">↓</span><span>SCROLL TO ENTER<small>Your journey moves with you.</small></span></div>
        {portalEnabled && <div ref={lookHint} className="cinematic-video-scroll cinematic-look-hint" hidden><span aria-hidden="true">↔</span><span>DRAG TO LOOK AROUND<small>Scroll to move forward.</small></span></div>}
        <div className="cinematic-video-meter" aria-hidden="true"><span ref={meter}>0%</span><div><i ref={track} /></div></div>
      </div>
    </>}
    {!enabled && !['reduced-motion', 'deep-link', 'disabled', 'offline', 'save-data'].includes(bypassReason || '') &&
      <a className="cinematic-replay" href="/?intro=replay">Replay intro <span aria-hidden="true">↗</span></a>}
    <div ref={home} className="cinematic-real-home" tabIndex={-1} data-cinematic-homepage>{children}</div>
  </div>;
}
