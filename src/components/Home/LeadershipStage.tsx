'use client';

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from '@radix-ui/react-icons';

interface LeadershipStageProps<T> {
  items: T[];
  label: string;
  intervalMs: number;
  paused?: boolean;
  onSelect: (item: T, index: number) => void;
  renderItem: (item: T) => ReactNode;
}

/** Circular navigation keeps the foreground portrait and the turning stage in sync. */
export default function LeadershipStage<T extends { id: string | number; name: string }>({
  items, label, intervalMs, paused = false, onSelect, renderItem,
}: LeadershipStageProps<T>) {
  const [position, setPosition] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const id = useId();
  const count = items.length;
  const active = count ? ((position % count) + count) % count : 0;
  const move = useCallback((step: number) => { if (count > 1) setPosition(value => value + step); }, [count]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update(); query.addEventListener('change', update);
    const element = root.current;
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .15 });
    if (element) observer?.observe(element);
    const visibility = () => setVisible(!document.hidden && (element ? element.getBoundingClientRect().bottom > 0 && element.getBoundingClientRect().top < window.innerHeight : true));
    document.addEventListener('visibilitychange', visibility);
    return () => { query.removeEventListener('change', update); observer?.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, []);

  const autoplay = count > 1 && intervalMs > 0 && !paused && !userPaused && !interacting && !reducedMotion && visible;
  useEffect(() => {
    if (!autoplay) return;
    const timer = window.setInterval(() => move(1), Math.max(1800, intervalMs));
    return () => window.clearInterval(timer);
  }, [autoplay, intervalMs, move, position]);

  if (!count) return null;

  return <div ref={root} className="leadership-stage" role="region" aria-roledescription="carousel" aria-label={label}
    style={{ '--stage-turn': `${position * -32}deg` } as CSSProperties}
    onMouseEnter={() => setInteracting(true)} onMouseLeave={() => { if (!drag.current) setInteracting(false); }}
    onFocusCapture={() => setInteracting(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}
    onKeyDown={event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1); }
    }} onPointerDown={event => {
      if (!event.isPrimary || event.button !== 0 || (event.target as HTMLElement).closest('[data-stage-control]')) return;
      drag.current = { x: event.clientX, y: event.clientY, moved: false }; suppressClick.current = false; setInteracting(true);
    }} onPointerMove={event => {
      const start = drag.current;
      if (!start) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
        start.moved = true; event.currentTarget.setPointerCapture(event.pointerId);
        event.currentTarget.style.setProperty('--stage-drag', `${Math.max(-80, Math.min(80, dx * .35))}px`);
      }
    }} onPointerUp={event => {
      const start = drag.current;
      if (!start) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      suppressClick.current = start.moved;
      if (start.moved && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1);
      drag.current = null; event.currentTarget.style.removeProperty('--stage-drag');
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      setInteracting(event.pointerType === 'mouse');
    }} onPointerCancel={event => { drag.current = null; suppressClick.current = false; event.currentTarget.style.removeProperty('--stage-drag'); setInteracting(false); }}
    onClickCapture={event => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }}>
    <div className="leadership-stage__floor" aria-hidden="true"><div className="leadership-stage__disc"><span /></div></div>
    <div id={`${id}-portraits`} className="leadership-stage__portraits">
      {items.map((person, index) => {
        let offset = (index - active + count) % count;
        if (offset > count / 2) offset -= count;
        if (Math.abs(offset) > 2) return null;
        const isActive = offset === 0;
        const angle = offset * Math.PI / 6;
        return <button type="button" key={person.id} className={`leadership-stage__slide ${isActive ? 'is-active' : ''}`}
          style={{
            '--offset': offset, '--distance': Math.abs(offset), '--side': Math.sign(offset),
            '--orbit-x': Math.sin(angle) / .5, '--orbit-depth': 1 - Math.cos(angle),
            '--orbit-scale': Math.pow(.86, Math.abs(offset)), zIndex: 3 - Math.abs(offset),
          } as CSSProperties}
          aria-label={`${isActive ? 'View profile of' : 'Show'} ${person.name}`} aria-current={isActive ? 'true' : undefined}
          tabIndex={isActive ? 0 : -1} onClick={() => { if (isActive) onSelect(person, index); else move(offset); }}>{renderItem(person)}</button>;
      })}
    </div>
    {count > 1 && <>
      <button className="leadership-stage__arrow leadership-stage__arrow--previous" data-stage-control type="button" aria-label={`Previous ${label}`} aria-controls={`${id}-portraits`} onClick={() => move(-1)}><ChevronLeftIcon /></button>
      <button className="leadership-stage__arrow leadership-stage__arrow--next" data-stage-control type="button" aria-label={`Next ${label}`} aria-controls={`${id}-portraits`} onClick={() => move(1)}><ChevronRightIcon /></button>
      <div className="leadership-stage__controls" data-stage-control>
        <div className="leadership-stage__dots" aria-label="Choose a profile">{items.map((person, index) => <button key={person.id} type="button" aria-label={`Show profile ${index + 1}: ${person.name}`} aria-current={active === index ? 'true' : undefined} onClick={() => {
          let step = index - active;
          if (step > count / 2) step -= count;
          if (step < -count / 2) step += count;
          move(step);
        }} />)}</div>
        {!reducedMotion && intervalMs > 0 && <button className="leadership-stage__playback" type="button" aria-label={`${userPaused ? 'Play' : 'Pause'} stage rotation`} aria-pressed={userPaused} onClick={() => setUserPaused(value => !value)}>{userPaused ? <PlayIcon /> : <PauseIcon />}</button>}
      </div>
    </>}
    <p className="leadership-stage__status" aria-live={autoplay ? 'off' : 'polite'} aria-atomic="true">{items[active].name}, {active + 1} of {count}</p>
  </div>;
}
