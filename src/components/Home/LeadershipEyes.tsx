'use client';

import { useEffect, useId, useRef } from 'react';

/** A photographic closed-eye frame stays registered with the responsive backdrop. */
export default function LeadershipEyes() {
  const root = useRef<SVGSVGElement>(null);
  const id = useId();

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = typeof IntersectionObserver === 'undefined';
    let nextTimer = 0;
    let blinkTimer = 0;
    let active = false;

    const clear = () => {
      window.clearTimeout(nextTimer); window.clearTimeout(blinkTimer);
      element.dataset.blinking = 'false';
    };
    const schedule = (first = false) => {
      nextTimer = window.setTimeout(() => blink(), first ? 2800 + Math.random() * 1600 : 4600 + Math.random() * 4400);
    };
    const blink = (double = false) => {
      if (!active) return;
      element.dataset.blinking = 'true';
      blinkTimer = window.setTimeout(() => {
        element.dataset.blinking = 'false';
        if (!double && Math.random() < .16) nextTimer = window.setTimeout(() => blink(true), 210);
        else schedule();
      }, 220);
    };
    const sync = () => {
      clear(); active = visible && !document.hidden && !motion.matches;
      element.dataset.active = String(active);
      if (active) schedule(true);
    };
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: .05 });
    observer?.observe(element);
    motion.addEventListener('change', sync); document.addEventListener('visibilitychange', sync);
    sync();
    return () => { active = false; clear(); observer?.disconnect(); motion.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); };
  }, []);

  return <svg ref={root} className="home-leadership__eyes" viewBox="0 0 1672 941" preserveAspectRatio="xMidYMid slice"
    aria-hidden="true" focusable="false" data-active="false" data-blinking="false">
    <defs>
      <filter id={`${id}-feather`} x="-15%" y="-30%" width="130%" height="160%"><feGaussianBlur stdDeviation="1.2" /></filter>
      <mask id={`${id}-sockets`} maskUnits="userSpaceOnUse" x="746" y="96" width="188" height="62">
        <path d="M754 103 827 130Q820 151 789 147Q753 147 754 103ZM851 130 926 101Q931 147 895 149Q864 150 851 130Z" fill="white" filter={`url(#${id}-feather)`} />
      </mask>
      <radialGradient id={`${id}-light`}><stop stopColor="#d4ffe3" stopOpacity=".65" /><stop offset=".35" stopColor="#36ff9e" stopOpacity=".36" /><stop offset="1" stopColor="#16e991" stopOpacity="0" /></radialGradient>
    </defs>
    <g className="home-leadership__eye-light"><ellipse cx="786" cy="124" rx="36" ry="22" fill={`url(#${id}-light)`} /><ellipse cx="892" cy="124" rx="36" ry="22" fill={`url(#${id}-light)`} /></g>
    <g className="home-leadership__eye-lids" mask={`url(#${id}-sockets)`}>
      <image href="/images/home-leadership-eyes-closed.webp" x="750" y="100" width="180" height="60" />
    </g>
  </svg>;
}
