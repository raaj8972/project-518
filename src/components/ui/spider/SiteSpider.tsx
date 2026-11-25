import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import { Loader2, Pause, Play } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useSystemStatus } from '../../../context/CombinedDataProvider';
import type { SpiderSceneProps } from './SpiderScene3D';
import { MechanicalSpiderIllustration } from './SpiderEmblem';

function SpiderExperience() {
  const [Scene, setScene] = useState<ComponentType<SpiderSceneProps> | null>(null);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [paused, setPaused] = useState(() => {
    try { const saved = localStorage.getItem('rico_spider_paused'); return saved === 'true' || (saved !== 'false' && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch { return false; }
  });
  const silkRef = useRef<SVGLineElement>(null);
  const onReady = useCallback(() => setReady(true), []);
  const onUnavailable = useCallback(() => setUnavailable(true), []);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      void import('./SpiderScene3D').then(module => { if (active) setScene(() => module.SpiderScene3D); }).catch(() => { if (active) setUnavailable(true); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, []);
  const toggle = () => setPaused(previous => {
    const next = !previous;
    try { localStorage.setItem('rico_spider_paused', String(next)); } catch { /* Optional preference storage. */ }
    return next;
  });
  return <>
    <div className={`site-spider-overlay${paused ? ' is-paused' : ''}`} data-spider-experience aria-hidden="true">
      <svg className="site-spider-silk"><line ref={silkRef} stroke="#a5ec91" strokeWidth="1.1" strokeLinecap="round" opacity="0" /></svg>
      {Scene && !unavailable && <Scene paused={paused} silkRef={silkRef} onReady={onReady} onUnavailable={onUnavailable} />}
      {unavailable && <MechanicalSpiderIllustration className="site-spider-fallback" />}
    </div>
    <div className="site-spider-controls">
    <button type="button" className="site-spider-toggle" onClick={toggle} disabled={unavailable || !ready} aria-pressed={!paused} title={unavailable ? '3D is unavailable on this device' : paused ? 'Show and resume the spider' : 'Pause and hide the moving spider'}>
      {!ready && !unavailable ? <Loader2 size={15} className="animate-spin" /> : paused ? <Play size={15} /> : <Pause size={15} />}
      <span>{unavailable ? 'Static spider' : !ready ? 'Loading spider' : paused ? 'Play spider' : 'Pause spider'}</span>
    </button>
    </div>
  </>;
}

export function SiteSpider() {
  const { theme } = useTheme();
  const { isReady } = useSystemStatus();
  return theme === 'spiderman' && isReady ? <SpiderExperience /> : null;
}
