import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createChronicleCycle, sampleChronicleCycle } from './chronicleMotion';

interface Point { x: number; y: number; }
interface Geometry { width: number; height: number; points: Point[]; eye: Point; source: Point; }
interface Segment { from: Point; a: Point; b: Point; to: Point; }
const coordinates = (point: Point) => `${point.x} ${point.y}`;
const curve = (segment: Segment) => ` C ${coordinates(segment.a)} ${coordinates(segment.b)} ${coordinates(segment.to)}`;

export default function TimelineBridge({ children, signature }: { children: ReactNode; signature: string }) {
  const root = useRef<HTMLDivElement>(null);
  const route = useRef<SVGPathElement>(null);
  const wand = useRef<SVGGElement>(null);
  const trail = useRef<SVGPathElement>(null);
  const sourceLight = useRef<SVGEllipseElement>(null);
  const id = useId();
  const [geometry, setGeometry] = useState<Geometry>({ width: 1000, height: 1600, points: [], eye: { x: 700, y: -200 }, source: { x: 500, y: 1700 } });

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const measure = () => {
      const bounds = element.getBoundingClientRect();
      const width = bounds.width || 1000;
      const height = bounds.height || Math.max(350, element.querySelectorAll('[data-chronicle-row]').length * 260);
      const points = [...element.querySelectorAll<HTMLElement>('.chronicle-card')].map((card, index) => {
        const rect = card.getBoundingClientRect();
        const left = card.closest('[data-chronicle-row]')?.classList.contains('chronicle-stop--left');
        return rect.width ? { x: width * (left ? .19 : .81), y: rect.bottom - bounds.top + 16 } : { x: width * (left ? .19 : .81), y: 170 + index * 230 };
      });
      const section = element.closest('.chronicles')?.getBoundingClientRect();
      const sky = element.closest('.chronicles')?.querySelector('.chronicles__sky')?.getBoundingClientRect();
      // Coordinates register with the separate eye layer in the 887px artwork.
      const eye = sky ? { x: sky.left - bounds.left + 582 * sky.width / 887, y: sky.top - bounds.top + 120 * sky.width / 887 } : { x: width * .7, y: -200 };
      const source = { x: width * .5, y: section ? section.bottom - bounds.top - 18 : height + 100 };
      const next = { width, height, points, eye, source };
      setGeometry(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(element);
    observer?.observe(element.closest('.chronicles') || element);
    element.querySelectorAll('[data-chronicle-row]').forEach(row => observer?.observe(row));
    window.addEventListener('resize', measure, { passive: true });
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [signature]);

  const { points, width, height, eye, source } = geometry;
  const first = points[0] || { x: width * .7, y: 130 };
  const start = { x: width * .58, y: Math.max(5, first.y - 150) };
  const segments: Segment[] = [{ from: start, a: { x: width * .88, y: start.y + 20 }, b: { x: first.x, y: first.y - 60 }, to: first }];
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1], current = points[index], middle = (previous.y + current.y) / 2;
    segments.push({ from: previous, a: { x: previous.x, y: middle }, b: { x: current.x, y: middle }, to: current });
  }
  const last = points[points.length - 1] || first;
  const end = { x: width * .14, y: height + 40 };
  segments.push({ from: last, a: { x: last.x, y: last.y + 65 }, b: { x: width * .2, y: height - 35 }, to: end });
  const path = `M ${coordinates(start)}${segments.map(curve).join('')}`;
  const energySegments: Segment[] = [
    { from: eye, a: { x: width * .93, y: eye.y + 70 }, b: { x: width * .94, y: start.y - 70 }, to: start },
    ...segments,
    { from: end, a: { x: width * .08, y: height + 70 }, b: { x: source.x, y: source.y - 70 }, to: source },
  ];
  let energyPath = `M ${coordinates(source)}`;
  const stops: { path: string; cardIndex: number }[] = [];
  for (const segment of energySegments.slice().reverse()) {
    energyPath += curve({ from: segment.to, a: segment.b, b: segment.a, to: segment.from });
    const cardIndex = points.indexOf(segment.from);
    if (cardIndex !== -1) stops.push({ path: energyPath, cardIndex });
  }
  const roadWidth = width < 600 ? 27 : 52;
  const wandLength = width < 600 ? 42 : 68;

  useEffect(() => {
    const element = root.current, pathElement = route.current;
    if (!element || !pathElement) return;
    const section = element.closest<HTMLElement>('.chronicles');
    const rows = [...element.querySelectorAll<HTMLElement>('[data-chronicle-row]')];
    const landings = [...element.querySelectorAll<SVGEllipseElement>('.chronicles__landing')];
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let visible = typeof IntersectionObserver === 'undefined';
    let frame = 0, elapsed = 0, previousTime = 0, previousCard = -1;
    let previousDistance = NaN;
    // Attribute/style reads do not measure layout. Avoid invalidating the SVG
    // and the section's inherited styles when the sampled value is unchanged.
    const attribute = (target: Element | null | undefined, name: string, value: string) => {
      if (target && target.getAttribute(name) !== value) target.setAttribute(name, value);
    };
    const property = (target: HTMLElement | null | undefined, name: string, value: string) => {
      if (target && target.style.getPropertyValue(name) !== value) target.style.setProperty(name, value);
    };
    const length = typeof pathElement.getTotalLength === 'function' ? pathElement.getTotalLength() : 0;
    const measuredStops = [...element.querySelectorAll<SVGPathElement>('[data-energy-stop]')].map(stop => ({ distance: stop.getTotalLength?.() || 0, cardIndex: Number(stop.dataset.energyStop) }));
    const cycle = createChronicleCycle(measuredStops, length, width);
    trail.current?.setAttribute('stroke-dasharray', `${wandLength * 1.7} ${length || 1}`);
    const resetLight = () => {
      section?.style.setProperty('--chronicle-eyes', '0');
      rows.forEach(row => row.style.removeProperty('--chronicle-charge'));
      landings.forEach(landing => landing.setAttribute('opacity', '0'));
      wand.current?.setAttribute('opacity', '0');
      trail.current?.setAttribute('opacity', '0');
      sourceLight.current?.setAttribute('opacity', '.04');
      previousCard = -1;
    };
    const draw = (now: number) => {
      if (previousTime) elapsed += Math.min(.1, (now - previousTime) / 1000);
      previousTime = now;
      const state = sampleChronicleCycle(cycle, elapsed);
      if (state.distance !== previousDistance) {
        const point = pathElement.getPointAtLength(state.distance);
        const before = pathElement.getPointAtLength(Math.max(0, state.distance - 2));
        const after = pathElement.getPointAtLength(Math.min(length, state.distance + 2));
        const angle = Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI;
        attribute(wand.current, 'transform', `translate(${point.x} ${point.y}) rotate(${angle})`);
        previousDistance = state.distance;
      }
      attribute(wand.current, 'opacity', String(state.wand));
      attribute(trail.current, 'stroke-dashoffset', String(wandLength * 1.7 - state.distance));
      attribute(trail.current, 'opacity', String(state.wand * .4));
      attribute(sourceLight.current, 'opacity', String(state.source));
      property(section, '--chronicle-eyes', String(state.eyes));
      if (previousCard !== state.cardIndex) {
        rows[previousCard]?.style.removeProperty('--chronicle-charge');
        attribute(landings[previousCard], 'opacity', '0');
        previousCard = state.cardIndex;
      }
      property(rows[state.cardIndex], '--chronicle-charge', String(state.charge));
      attribute(landings[state.cardIndex], 'opacity', String(state.charge * .75));
      attribute(element, 'data-energy-phase', state.phase);
      frame = requestAnimationFrame(draw);
    };
    const sync = () => {
      const active = visible && !document.hidden && !motion?.matches;
      element.dataset.energyActive = String(active);
      if (section) section.dataset.energyActive = String(active);
      cancelAnimationFrame(frame); previousTime = 0;
      if (motion?.matches) { elapsed = 0; resetLight(); }
      if (active && length > 0) frame = requestAnimationFrame(draw);
    };
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: 0 });
    observer?.observe(section || element);
    motion?.addEventListener?.('change', sync);
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => {
      cancelAnimationFrame(frame); observer?.disconnect();
      motion?.removeEventListener?.('change', sync); document.removeEventListener('visibilitychange', sync);
      resetLight();
      if (section) section.dataset.energyActive = 'false';
    };
  }, [geometry, signature, width, wandLength]);

  return <div ref={root} className="chronicles__journey" data-energy-active="false">
    <svg className="chronicles__bridge" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" fill="none" aria-hidden="true">
      <defs>
        <pattern id={`${id}-stone`} patternUnits="userSpaceOnUse" width="96" height="96"><image href="/images/festival-natural-stone.webp" width="96" height="96" preserveAspectRatio="xMidYMid slice"/></pattern>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#9c7026"/><stop offset=".3" stopColor="#ffdc79"/><stop offset=".53" stopColor="#72501f"/><stop offset=".72" stopColor="#ffe9a0"/><stop offset="1" stopColor="#a5782c"/></linearGradient>
        <filter id={`${id}-light`} x="-30%" y="-10%" width="160%" height="120%"><feGaussianBlur stdDeviation="5"/></filter>
      </defs>
      <path d={path} stroke="#020b07" strokeWidth={roadWidth + 18} transform="translate(0 20)" opacity=".75"/>
      <path d={path} stroke={`url(#${id}-gold)`} strokeWidth={roadWidth + 6} transform="translate(0 11)"/>
      <path d={path} stroke="#0c2116" strokeWidth={roadWidth + 2} transform="translate(0 8)"/>
      <path d={path} stroke="#42ff89" strokeWidth={roadWidth + 14} opacity=".2" filter={`url(#${id}-light)`}/>
      <path d={path} stroke={`url(#${id}-gold)`} strokeWidth={roadWidth + 4}/>
      <path d={path} stroke={`url(#${id}-stone)`} strokeWidth={roadWidth - 4}/>
      <path d={path} stroke="#131d17" strokeWidth={roadWidth - 3} strokeDasharray="1.5 14" opacity=".9"/>
      <path d={path} stroke="#e7d6a9" strokeWidth={roadWidth - 6} strokeDasharray=".7 14.8" opacity=".45"/>
      <path d={path} stroke="#dec184" strokeWidth="1.5" opacity=".65"/>
    </svg>
    <svg className="chronicles__energy" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-source`}><stop stopColor="#e0ffb0"/><stop offset=".2" stopColor="#71ff85" stopOpacity=".9"/><stop offset="1" stopColor="#13ed75" stopOpacity="0"/></radialGradient>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#071c12"/><stop offset=".28" stopColor="#c5c38c"/><stop offset=".47" stopColor="#f6efbf"/><stop offset=".65" stopColor="#716039"/><stop offset="1" stopColor="#102b1d"/></linearGradient>
        <linearGradient id={`${id}-crystal`}><stop stopColor="#23b55c"/><stop offset=".6" stopColor="#aaff8d"/><stop offset="1" stopColor="#f1ffcf"/></linearGradient>
        <filter id={`${id}-wand-glow`} x="-80%" y="-400%" width="260%" height="900%"><feGaussianBlur stdDeviation="3"/></filter>
      </defs>
      <path ref={route} d={energyPath} stroke="none"/>
      {stops.map(stop => <path key={stop.cardIndex} d={stop.path} data-energy-stop={stop.cardIndex} stroke="none"/>)}
      <ellipse ref={sourceLight} cx={source.x} cy={source.y} rx={width * .22} ry="65" fill={`url(#${id}-source)`} opacity=".04"/>
      <path ref={trail} d={energyPath} stroke="#75ffa5" strokeWidth="7" strokeLinecap="round" opacity="0"/>
      {points.map((point, index) => <ellipse key={index} className="chronicles__landing" cx={point.x} cy={point.y} rx={width < 600 ? 53 : 100} ry="37" fill={`url(#${id}-source)`} opacity="0"/>)}
      <g ref={wand} className="chronicles__wand" opacity="0">
        <ellipse cx="0" cy="9" rx={wandLength * .8} ry="17" fill={`url(#${id}-source)`} opacity=".65"/>
        <path d={`M${-wandLength * .45} 0H${wandLength * .43}`} stroke="#52ff83" strokeWidth="9" filter={`url(#${id}-wand-glow)`} opacity=".65"/>
        <rect x={-wandLength * .48} y="-3" width={wandLength * .8} height="6" rx="2" fill={`url(#${id}-metal)`} stroke="#d1c891" strokeWidth=".6"/>
        <path d={`M${-wandLength * .39} -1.2H${wandLength * .27}`} stroke="#bdffac" strokeWidth="1.1"/>
        {[-.4,-.31,-.22,.19,.27].map(position => <path key={position} d={`M${wandLength * position} -3.6v7.2`} stroke="#b7944e" strokeWidth="1.6"/>)}
        <path d={`M${wandLength * .31} -4.5L${wandLength * .52} 0 ${wandLength * .31} 4.5 ${wandLength * .26} 0Z`} fill={`url(#${id}-crystal)`} stroke="#ddffd0" strokeWidth=".7"/>
        <circle cx={wandLength * .49} cy="0" r="9" fill={`url(#${id}-source)`}/>
        <circle cx={wandLength * .49} cy="0" r="1.8" fill="#f5ffe5"/>
      </g>
    </svg>
    {children}
  </div>;
}
