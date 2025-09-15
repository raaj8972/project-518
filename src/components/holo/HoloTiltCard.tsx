import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import './HoloTiltCard.css';

const DEFAULT_BEHIND_GRADIENT = 'radial-gradient(farthest-side circle at var(--pointer-x) var(--pointer-y),hsla(266,100%,90%,var(--card-opacity)) 4%,hsla(266,50%,80%,calc(var(--card-opacity)*0.75)) 10%,hsla(266,25%,70%,calc(var(--card-opacity)*0.5)) 50%,hsla(266,0%,60%,0) 100%),radial-gradient(35% 52% at 55% 20%,#00ffaac4 0%,#073aff00 100%),radial-gradient(100% 100% at 50% 50%,#00c1ffff 1%,#073aff00 76%),conic-gradient(from 124deg at 50% 50%,#c137ffff 0%,#07c6ffff 40%,#07c6ffff 60%,#c137ffff 100%)';
const DEFAULT_INNER_GRADIENT = 'linear-gradient(145deg,#60496e8c 0%,#71C4FF44 100%)';

const clamp = (v:number, min=0, max=100) => Math.min(Math.max(v,min),max);
const round = (v:number, p=3) => parseFloat(v.toFixed(p));
const adjust = (val:number, a:number, b:number, c:number, d:number) => round(c + ((d-c) * (val - a)) / (b - a));
const easeInOutCubic = (x:number) => x < 0.5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3)/2;

export interface HoloTiltCardProps {
  className?: string;
  showBehindGradient?: boolean;
  behindGradient?: string;
  innerGradient?: string;
  enableTilt?: boolean;
  enableMobileTilt?: boolean;
  mobileTiltSensitivity?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

const HoloTiltCard: React.FC<HoloTiltCardProps> = ({
  className = '',
  showBehindGradient = true,
  behindGradient,
  innerGradient,
  enableTilt = true,
  enableMobileTilt = false,
  mobileTiltSensitivity = 5,
  children,
  style,
}) => {
  const wrapRef = useRef<HTMLDivElement|null>(null);
  const cardRef = useRef<HTMLElement|null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Detect prefers-reduced-motion and update reactively
  useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(!!mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  const handlers = useMemo(() => {
    if (!enableTilt || reducedMotion) return null;
    let rafId:number|undefined;

    const update = (offsetX:number, offsetY:number, card:HTMLElement, wrap:HTMLElement) => {
      const w = card.clientWidth; const h = card.clientHeight;
      const px = clamp((100 / w) * offsetX); const py = clamp((100 / h) * offsetY);
      const cx = px - 50; const cy = py - 50;
      const props: Record<string,string> = {
        '--pointer-x': `${px}%`, '--pointer-y': `${py}%`,
        '--background-x': `${adjust(px,0,100,35,65)}%`, '--background-y': `${adjust(py,0,100,35,65)}%`,
        '--pointer-from-center': `${clamp(Math.hypot(py-50, px-50)/50, 0, 1)}`,
        '--pointer-from-top': `${py/100}`, '--pointer-from-left': `${px/100}`,
        // Milder tilt by default
        '--rotate-x': `${round(-(cx/8))}deg`, '--rotate-y': `${round(cy/6)}deg`,
      };
      Object.entries(props).forEach(([k,v]) => wrap.style.setProperty(k, v));
    };

    const smooth = (duration:number, startX:number, startY:number, card:HTMLElement, wrap:HTMLElement) => {
      const t0 = performance.now();
      const targetX = wrap.clientWidth / 2; const targetY = wrap.clientHeight / 2;
      const loop = (t:number) => {
        const p = Math.min(1, (t - t0) / duration); const e = easeInOutCubic(p);
        const x = adjust(e, 0, 1, startX, targetX); const y = adjust(e, 0, 1, startY, targetY);
        update(x, y, card, wrap);
        if (p < 1) rafId = requestAnimationFrame(loop) as unknown as number;
      };
      rafId = requestAnimationFrame(loop) as unknown as number;
    };

    return {
      update,
      smooth,
      cancel: () => { if (rafId) { cancelAnimationFrame(rafId as number); rafId = undefined; } },
    };
  }, [enableTilt, reducedMotion]);

  const onMove = useCallback((e:PointerEvent) => {
    const card = cardRef.current; const wrap = wrapRef.current; if (!card || !wrap || !handlers) return;
    const rect = card.getBoundingClientRect();
    handlers.update(e.clientX - rect.left, e.clientY - rect.top, card, wrap);
  }, [handlers]);

  const onEnter = useCallback(() => {
    const card = cardRef.current; const wrap = wrapRef.current; if (!card || !wrap || !handlers) return;
    handlers.cancel(); wrap.classList.add('active'); card.classList.add('active');
  }, [handlers]);

  const onLeave = useCallback((e:PointerEvent) => {
    const card = cardRef.current; const wrap = wrapRef.current; if (!card || !wrap || !handlers) return;
    handlers.smooth(600, e.offsetX, e.offsetY, card, wrap); wrap.classList.remove('active'); card.classList.remove('active');
  }, [handlers]);

  const onDeviceOrientation = useCallback((e:DeviceOrientationEvent) => {
    const card = cardRef.current as HTMLElement; const wrap = wrapRef.current as HTMLElement; if (!card || !wrap || !handlers) return;
    const { beta, gamma } = e; if (beta == null || gamma == null) return;
    handlers.update(card.clientHeight/2 + gamma * (mobileTiltSensitivity||5), card.clientWidth/2 + (beta - 20) * (mobileTiltSensitivity||5), card, wrap);
  }, [handlers, mobileTiltSensitivity]);

  useEffect(() => {
    if (!enableTilt || reducedMotion || !handlers) return;
    const card = cardRef.current as HTMLElement; const wrap = wrapRef.current as HTMLElement; if (!card || !wrap) return;

    const click = () => {
      if (!enableMobileTilt || location.protocol !== 'https:') return;
      const req = (window as any).DeviceMotionEvent?.requestPermission;
      if (typeof req === 'function') {
        req().then((s:string) => { if (s === 'granted') window.addEventListener('deviceorientation', onDeviceOrientation); }).catch(()=>{});
      } else {
        window.addEventListener('deviceorientation', onDeviceOrientation);
      }
    };

    card.addEventListener('pointerenter', onEnter);
    card.addEventListener('pointermove', onMove);
    card.addEventListener('pointerleave', onLeave);
    card.addEventListener('click', click);

    const initialX = wrap.clientWidth - 70; const initialY = 60;
    handlers.update(initialX, initialY, card, wrap);
    handlers.smooth(1500, initialX, initialY, card, wrap);

    return () => {
      card.removeEventListener('pointerenter', onEnter);
      card.removeEventListener('pointermove', onMove);
      card.removeEventListener('pointerleave', onLeave);
      card.removeEventListener('click', click);
      window.removeEventListener('deviceorientation', onDeviceOrientation);
      handlers.cancel();
    };
  }, [enableTilt, enableMobileTilt, reducedMotion, handlers, onMove, onEnter, onLeave, onDeviceOrientation]);

  const cssVars: React.CSSProperties = useMemo(() => ({
    '--behind-gradient': showBehindGradient ? (behindGradient ?? DEFAULT_BEHIND_GRADIENT) : 'none',
    '--inner-gradient': innerGradient ?? DEFAULT_INNER_GRADIENT,
  }) as React.CSSProperties, [showBehindGradient, behindGradient, innerGradient]);

  return (
    <div ref={wrapRef} className={`holo-wrap ${className}`.trim()} style={{...cssVars, ...style}}>
      <section ref={cardRef as any} className="holo-card">
        <div className="holo-inside" />
        <div className="holo-shine" />
        <div className="holo-glare" />
        <div className="holo-content">{children}</div>
      </section>
    </div>
  );
};

export default React.memo(HoloTiltCard);
