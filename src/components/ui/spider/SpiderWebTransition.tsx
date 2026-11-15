import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useBlocker, useNavigate, type BlockerFunction } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { isFestivalRoute } from '../../../utils/portalRoutes';

const SILK_TEXTURE = '/images/effects/real-silk-web.webp';
const SHOOT_MS = 520;
const REVEAL_MS = 380;
const EXCLUDED = '[data-spider-web="off"], [inert], [aria-hidden="true"], [aria-disabled="true"]';

type WebShot = { x: number; y: number; phase: 'shooting' | 'revealing' };

/** Only a change of page shoots silk; controls and dialogs keep their own response. */
export function SpiderWebTransition({ enabled = true }: { enabled?: boolean }) {
  const navigate = useNavigate();
  const [shot, setShot] = useState<WebShot | null>(null);
  const phase = useRef<'idle' | 'shooting' | 'revealing'>('idle');
  const input = useRef({ x: 0, y: 0, time: -Infinity });
  const skip = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const shouldBlock = useCallback<BlockerFunction>(({ currentLocation, nextLocation }) =>
    enabled && !skip.current && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    && isFestivalRoute(currentLocation.pathname) && isFestivalRoute(nextLocation.pathname)
    && currentLocation.pathname !== nextLocation.pathname, [enabled]);
  const blocker = useBlocker(shouldBlock);

  useEffect(() => {
    if (!enabled) return;
    const texture = new Image();
    texture.decoding = 'async';
    texture.src = SILK_TEXTURE;

    const rememberInput = (event: MouseEvent) => {
      const node = event.target;
      if (!(node instanceof Element)) return;
      const control = node.closest<HTMLElement>('a, button, [role="button"]') || node;
      const rect = control.getBoundingClientRect();
      input.current = {
        x: event.detail === 0 ? rect.left + rect.width / 2 : event.clientX,
        y: event.detail === 0 ? rect.top + rect.height / 2 : event.clientY,
        time: performance.now(),
      };
      skip.current = !!control.closest(EXCLUDED) || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
      queueMicrotask(() => { skip.current = false; });
    };
    const followNativeLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>('a[href]');
      if (!link || link.closest(EXCLUDED) || link.hasAttribute('download') || (link.target && link.target.toLowerCase() !== '_self')) return;
      const url = new URL(link.href, location.href);
      if (!/^https?:$/.test(url.protocol) || url.origin !== location.origin || url.pathname === location.pathname
        || !isFestivalRoute(url.pathname) || !isFestivalRoute(location.pathname)
        || /^\/(?:api|assets|images|media|models)(?:\/|$)/.test(url.pathname) || /\.[a-z0-9]{1,8}$/i.test(url.pathname)) return;
      event.preventDefault();
      navigate(`${url.pathname}${url.search}${url.hash}`);
    };

    document.addEventListener('click', rememberInput, true);
    // React links have already prevented default by the time this listener runs.
    document.addEventListener('click', followNativeLink);
    return () => {
      document.removeEventListener('click', rememberInput, true);
      document.removeEventListener('click', followNativeLink);
    };
  }, [enabled, navigate]);

  useEffect(() => {
    if (!enabled) {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      phase.current = 'idle';
      setShot(null);
      if (blocker.state === 'blocked') blocker.reset();
      return;
    }
    if (blocker.state !== 'blocked') return;
    if (phase.current === 'revealing') { blocker.reset(); return; }
    if (phase.current === 'shooting') return;
    phase.current = 'shooting';
    const recent = performance.now() - input.current.time < 400;
    setShot({
      x: recent ? Math.max(0, Math.min(innerWidth, input.current.x)) : innerWidth / 2,
      y: recent ? Math.max(0, Math.min(innerHeight, input.current.y)) : innerHeight / 2,
      phase: 'shooting',
    });
    timers.current.push(setTimeout(() => {
      phase.current = 'revealing';
      setShot(current => current && { ...current, phase: 'revealing' });
      blocker.proceed();
      timers.current.push(setTimeout(() => { phase.current = 'idle'; setShot(null); }, REVEAL_MS));
    }, SHOOT_MS));
  }, [blocker, enabled]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  if (!shot) return null;
  const origin = { '--web-shot-x': `${shot.x}px`, '--web-shot-y': `${shot.y}px` } as CSSProperties;
  return createPortal(<div className="spider-web-transition" data-spider-web-transition data-phase={shot.phase} style={origin} aria-hidden="true" data-spider-web="off">
    <div className="spider-web-transition-cover" />
    <div className="spider-web-transition-silk spider-web-transition-silk-back" />
    <div className="spider-web-transition-silk spider-web-transition-silk-front" />
    <div className="spider-web-transition-silk spider-web-transition-silk-cross" />
  </div>, document.body);
}
