import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import TitleAtmosphere from './TitleAtmosphere';
import IntroWebWipe from './IntroWebWipe';
import './RicorrenzaPrelude.css';

export const LOGO_PRELUDE_MS = 5000;
export const LOGO_ASSET_WAIT_MS = 1200;
export const LOGO_WEB_WIPE_MS = 1000;
const BACKDROP = '/media/cinematic/ricorrenza-title-atmosphere-v1.webp';
const MOBILE_BACKDROP = '/media/cinematic/ricorrenza-title-atmosphere-mobile-v1.webp';
const WORDMARK = '/media/cinematic/ricorrenza-title-metal-v1.webp';
const SCROLL_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ']);

function visibleCountdown(callback: () => void, milliseconds: number, onVisibility?: (hidden: boolean) => void) {
  let remaining = milliseconds, started = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const resume = () => {
    onVisibility?.(document.hidden);
    if (document.hidden) {
      if (timer !== undefined) remaining = Math.max(0, remaining - (performance.now() - started));
      clearTimeout(timer); timer = undefined;
    } else if (timer === undefined) {
      started = performance.now(); timer = setTimeout(callback, remaining);
    }
  };
  document.addEventListener('visibilitychange', resume); resume();
  return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', resume); };
}

/** A self-contained, automatic title card before the existing scroll film. */
export default function RicorrenzaPrelude({ onComplete }: { onComplete: () => void }) {
  const [backdrop] = useState(() => window.innerWidth < 768 ? MOBILE_BACKDROP : BACKDROP);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(() => document.hidden);
  const [artworkReady, setArtworkReady] = useState(false);
  const [webStarted, setWebStarted] = useState(false);
  const [webCovered, setWebCovered] = useState(false);
  const completed = useRef(false);
  const completeCallback = useRef(onComplete);
  completeCallback.current = onComplete;
  const finish = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    completeCallback.current();
  }, []);
  const coverTitle = useCallback(() => setWebCovered(true), []);

  useLayoutEffect(() => {
    const html = document.documentElement, body = document.body;
    const htmlOverflow = html.style.overflow, bodyOverflow = body.style.overflow;
    html.style.overflow = 'hidden'; body.style.overflow = 'hidden';
    const blockScroll = (event: Event) => { if (event.cancelable) event.preventDefault(); };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); finish(); }
      else if (event.key === ' ' && event.target instanceof HTMLElement && event.target.closest('button')) return;
      else if (SCROLL_KEYS.has(event.key)) event.preventDefault();
    };
    const options = { passive: false, capture: true };
    window.addEventListener('wheel', blockScroll, options);
    window.addEventListener('touchmove', blockScroll, options);
    window.addEventListener('keydown', keydown, true);
    return () => {
      html.style.overflow = htmlOverflow; body.style.overflow = bodyOverflow;
      window.removeEventListener('wheel', blockScroll, true);
      window.removeEventListener('touchmove', blockScroll, true);
      window.removeEventListener('keydown', keydown, true);
    };
  }, [finish]);

  useEffect(() => {
    let disposed = false;
    const images: HTMLImageElement[] = [];
    const start = () => { if (!disposed) setRunning(true); };
    // The title never gets stuck on a missing asset or an interrupted request.
    const cancelDeadline = visibleCountdown(start, LOGO_ASSET_WAIT_MS);
    void Promise.all([backdrop, WORDMARK].map(src => new Promise<void>(resolve => {
      const image = new Image();
      images.push(image);
      image.onload = () => resolve(); image.onerror = () => resolve();
      image.src = src;
      if (image.complete) resolve();
    }))).then(() => { cancelDeadline(); start(); });
    return () => {
      disposed = true; cancelDeadline();
      images.forEach(image => { image.onload = null; image.onerror = null; });
    };
  }, [backdrop]);

  useEffect(() => {
    if (!running) return;
    const cancelWeb = visibleCountdown(() => setWebStarted(true), LOGO_PRELUDE_MS - LOGO_WEB_WIPE_MS);
    const cancelFinish = visibleCountdown(finish, LOGO_PRELUDE_MS, setPaused);
    return () => { cancelWeb(); cancelFinish(); };
  }, [running, finish]);

  return <div
    className="rico-logo-prelude"
    data-logo-prelude
    data-running={running}
    data-paused={paused}
    data-artwork-ready={artworkReady}
    data-web-transition-started={webStarted}
    data-web-covered={webCovered}
    data-lenis-prevent
    role="region"
    aria-label="IQ City Medical College presents Ricorrenza, RICO 2026. Opening title animation."
    style={{ '--rico-title-duration': `${LOGO_PRELUDE_MS}ms` } as CSSProperties}
  >
    <div className="rico-title-content" aria-hidden={webCovered}>
    <TitleAtmosphere backdrop={backdrop} running={running} paused={paused || webCovered} />
    <div className="rico-title-camera" aria-hidden="true">
      <div className="rico-title-credit">
        <span className="rico-title-college">IQ CITY</span>
        <span className="rico-title-medical">MEDICAL COLLEGE</span>
        <span className="rico-title-presents">PRESENTS</span>
      </div>
      <div className="rico-title-wordmark">
        {!artworkReady && <span className="rico-title-fallback">Ricorrenza</span>}
        <img src={WORDMARK} alt="" decoding="async" onLoad={() => setArtworkReady(true)} onError={() => setArtworkReady(false)} />
        <div className="rico-title-metal-sweep"><i /></div>
        <div className="rico-title-compass"><i /><b /></div>
      </div>
      <div className="rico-title-edition">
        <div className="rico-title-plaque"><span>RICO 2026</span></div>
        <span className="rico-title-caption">ANNUAL CULTURAL FEST</span>
      </div>
    </div>
    <div className="rico-title-particles" aria-hidden="true">
      {Array.from({ length: 16 }, (_, index) => <i key={index} style={{ '--spark': index, '--spark-row': index % 4 } as CSSProperties} />)}
    </div>
    <div className="rico-title-darkness" aria-hidden="true" />
    </div>
    <IntroWebWipe running={webStarted} paused={paused} durationMs={LOGO_WEB_WIPE_MS} onCovered={coverTitle} onComplete={finish} />
    <button type="button" className="rico-title-skip" onClick={finish}>Skip title animation</button>
  </div>;
}
