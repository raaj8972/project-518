import { useEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { EventsHeroCharacter } from './EventsHeroCharacter';

/** Lift the crown above the fixed navbar without lifting the cloak over event text. */
export function EventsHeroForeground({ heroRef }: { heroRef: RefObject<HTMLElement> }) {
  const [bounds, setBounds] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const measure = () => {
      const rect = hero.getBoundingClientRect();
      setBounds({ top: rect.top + window.scrollY, left: rect.left + window.scrollX, width: rect.width, height: rect.height });
    };
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(hero);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [heroRef]);
  if (!bounds) return null;
  return createPortal(<div className="arena-hero-foreground" style={bounds} aria-hidden="true"><EventsHeroCharacter /></div>, document.body);
}
