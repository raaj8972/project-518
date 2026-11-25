import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from '@radix-ui/react-icons';
import type { FamilyPerson } from '../../utils/familyPeople';
import { FamilyPersonCard } from './FamilyPersonCard';
import { FamilySpotlight } from './FamilySpotlight';

export function FamilyMembersCarousel({ members, label }: { members: FamilyPerson[]; label: string }) {
  const track = useRef<HTMLDivElement>(null);
  const lightRefs = useRef<(HTMLDivElement | null)[]>([]);
  const id = useId();
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const measure = () => setColumns(Math.max(1, Math.min(5, Math.floor((element.clientWidth + 20) / 124))));
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(element);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  // Give each visible member column its own compact beam at every viewport width.
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    let frame = 0;
    const updateLight = () => {
      frame = 0;
      const viewport = element.getBoundingClientRect();
      const carousel = element.parentElement!.getBoundingClientRect();
      const portraits = [...element.querySelectorAll<HTMLElement>('.family-person-portrait')].map(portrait => portrait.getBoundingClientRect());
      const readable = portraits.filter(rect => rect.width > 0 && Math.min(rect.right, viewport.right) - Math.max(rect.left, viewport.left) >= rect.width * .65);
      const count = Math.min(columns, readable.length);
      lightRefs.current.forEach((lamp, index) => {
        if (!lamp) return;
        if (index >= count) { lamp.style.visibility = 'hidden'; return; }
        const center = viewport.left + viewport.width * (index + .5) / count;
        const target = readable.reduce<DOMRect | null>((best, rect) => !best || Math.abs(rect.left + rect.width / 2 - center) < Math.abs(best.left + best.width / 2 - center) ? rect : best, null);
        if (!target) { lamp.style.visibility = 'hidden'; return; }
        readable.splice(readable.indexOf(target), 1);
        lamp.style.visibility = 'visible';
        lamp.style.left = `${target.left + target.width / 2 - carousel.left}px`;
        const emitterTop = carousel.top + lamp.offsetTop + 20;
        lamp.style.setProperty('--member-beam-width', `${target.width * 1.3}px`);
        lamp.style.setProperty('--member-beam-length', `${Math.max(80, target.top - emitterTop + target.height * .85)}px`);
      });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(updateLight); };
    updateLight();
    element.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    observer?.observe(element);
    return () => { if (frame) cancelAnimationFrame(frame); observer?.disconnect(); element.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
  }, [members.length, columns]);

  const advance = useCallback((direction: number, automatic = false) => {
    const element = track.current;
    if (!element) return;
    const max = element.scrollWidth - element.clientWidth;
    if (max <= 0) return;
    const step = (element.firstElementChild as HTMLElement)?.offsetWidth || 152;
    const next = direction > 0
      ? element.scrollLeft >= max - 2 ? 0 : Math.min(element.scrollLeft + step + 20, max)
      : element.scrollLeft <= 2 ? max : Math.max(element.scrollLeft - step - 20, 0);
    element.scrollTo({ left: Math.max(0, Math.min(next, max)), behavior: reducedMotion ? 'instant' : 'smooth' });
    if (!automatic) setPaused(true);
  }, [reducedMotion]);

  useEffect(() => {
    if (paused || interacting || reducedMotion || members.length < 2) return;
    const timer = window.setInterval(() => advance(1, true), 3200);
    return () => window.clearInterval(timer);
  }, [paused, interacting, reducedMotion, members.length, advance]);

  return <div className="family-carousel" role="region" aria-roledescription="carousel" aria-label={label}
    onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}
    onFocusCapture={() => setInteracting(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}>
    <div className="family-carousel-toolbar">
      <h4 className="family-group-label">Team members <span>{members.length}</span></h4>
    </div>
    {members.slice(0, columns).map((_, index) => <div key={index} ref={element => { lightRefs.current[index] = element; }} className="family-members-light" style={{ visibility: 'hidden' }} aria-hidden="true"><FamilySpotlight soft /></div>)}
    <div ref={track} id={id} className="family-carousel-track" style={{ '--family-member-columns': columns } as CSSProperties} tabIndex={0} aria-label={`${label}, swipe or use arrow keys`}
      onTouchStart={() => setPaused(true)} onPointerDown={() => setPaused(true)}
      onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); advance(event.key === 'ArrowRight' ? 1 : -1); } }}>
      {members.map(member => <div className="family-carousel-slide" key={member.id}><FamilyPersonCard person={member} /></div>)}
    </div>
    {members.length > 1 && <div className="family-carousel-controls family-carousel-controls--bottom">
      <button type="button" aria-label={`Previous ${label}`} aria-controls={id} onClick={() => advance(-1)}><ChevronLeftIcon /></button>
      {!reducedMotion && <button type="button" aria-label={`${paused ? 'Play' : 'Pause'} ${label}`} onClick={() => setPaused(value => !value)}>{paused ? <PlayIcon /> : <PauseIcon />}</button>}
      <button type="button" aria-label={`Next ${label}`} aria-controls={id} onClick={() => advance(1)}><ChevronRightIcon /></button>
    </div>}
  </div>;
}
