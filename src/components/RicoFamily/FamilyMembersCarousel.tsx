import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from '@radix-ui/react-icons';
import type { FamilyPerson } from '../../utils/familyPeople';
import { FamilyPersonCard } from './FamilyPersonCard';
import { FamilySpotlight } from './FamilySpotlight';

export function FamilyMembersCarousel({ members, label }: { members: FamilyPerson[]; label: string }) {
  const track = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);
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

  // Track scroll position → move spotlight over the centered slide
  useEffect(() => {
    const el = track.current;
    const lamp = lightRef.current;
    if (!el || !lamp) return;

    const updateLight = () => {
      const slides = el.querySelectorAll<HTMLElement>('.family-carousel-slide');
      if (!slides.length) return;
      const slideW = slides[0].offsetWidth + 20; // width + gap
      const cols = Math.max(1, Math.min(5, Math.floor((el.clientWidth + 20) / 124)));
      // Which slide group is closest to center?
      const centerScroll = el.scrollLeft + el.clientWidth / 2;
      const activeIdx = Math.round((centerScroll - el.clientWidth / 2) / (slideW * cols));
      const clampedIdx = Math.max(0, Math.min(members.length - 1, activeIdx * cols + Math.floor(cols / 2)));
      const slide = slides[clampedIdx] ?? slides[0];
      // Position lamp centered over that slide, relative to .family-carousel
      const carousel = el.parentElement!;
      const carouselRect = carousel.getBoundingClientRect();
      const slideRect = slide.getBoundingClientRect();
      const targetLeft = slideRect.left + slideRect.width / 2 - carouselRect.left;
      lamp.style.left = `${targetLeft}px`;
    };

    updateLight();
    el.addEventListener('scroll', updateLight, { passive: true });
    window.addEventListener('resize', updateLight);
    return () => {
      el.removeEventListener('scroll', updateLight);
      window.removeEventListener('resize', updateLight);
    };
  }, [members.length]);

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
    <div ref={lightRef} className="family-members-light"><FamilySpotlight soft /></div>
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
