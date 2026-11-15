import { useEffect, useState } from 'react';
import { BRAND_YEAR } from '../../../constants/brand';
import { SpiderEmblem } from './SpiderEmblem';
import { canPlayDocumentIntro, isDocumentEntryRoute, markDocumentIntroPlayed } from '../../cinematic/documentIntro';

/** Readiness-driven opening: no video download, fake percentage or minimum wait. */
export function SpiderOpening({ loading, pathname = window.location.pathname }: { loading: boolean; pathname?: string }) {
  const [initialEntry] = useState(() => canPlayDocumentIntro('opening', pathname));
  const [phase, setPhase] = useState<'loading' | 'revealing' | 'complete'>('loading');
  useEffect(() => { if (initialEntry) markDocumentIntroPlayed('opening'); }, [initialEntry]);
  useEffect(() => {
    if (!initialEntry || !isDocumentEntryRoute(pathname) || loading || phase === 'complete') return;
    setPhase('revealing');
    const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(() => setPhase('complete'), reduced ? 0 : 360);
    return () => clearTimeout(timer);
  }, [initialEntry, pathname, loading, phase === 'complete']);
  if (!initialEntry || !isDocumentEntryRoute(pathname) || phase === 'complete') return null;

  return <div className={`spider-opening${phase === 'revealing' ? ' is-revealing' : ''}`} data-spider-opening role="progressbar" aria-label="Opening Ricorrenza" aria-valuetext={loading ? 'Loading your campus' : 'Ready'} aria-busy={loading}>
    <div className="spider-opening-grid" aria-hidden="true" />
    <div className="spider-opening-top"><span>IQ CITY</span><span>{BRAND_YEAR} EDITION</span></div>
    <div className="spider-opening-center">
      <div className="spider-opening-mark"><SpiderEmblem /><span className="spider-opening-orbit" aria-hidden="true" /></div>
      <p className="spider-opening-title">RICORRENZA</p>
      <p className="spider-opening-status" role="status">{loading ? 'Your campus. Coming into focus.' : 'Your world. Ready to move.'}</p>
      <div className={`spider-opening-track${loading ? '' : ' is-ready'}`} aria-hidden="true"><span /></div>
    </div>
    <div className="spider-opening-bottom"><span>Culture / Competition / Community</span><span>ENTER THE EXPERIENCE</span></div>
  </div>;
}
