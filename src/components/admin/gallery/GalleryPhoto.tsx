import { useEffect, useMemo, useState, useRef } from 'react';
import { ImageIcon } from '@radix-ui/react-icons';
import { galleryImageSources } from '../../../../shared/galleryMedia';
export function GalleryPhoto({ src, alt = '', width = 640, className = '', onHealth }: { src: string; alt?: string; width?: number; className?: string; onHealth?: (failed: boolean) => void }) {
  const sources = useMemo(() => galleryImageSources(src, width), [src, width]);
  const [stage, setStage] = useState(0), [loaded, setLoaded] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const callback = useRef(onHealth); callback.current = onHealth;
  useEffect(() => { setStage(0); setLoaded(false); }, [src, width]);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); } }, { rootMargin: '200px' });
    if (host.current) observer.observe(host.current); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible || loaded || stage >= sources.length) return;
    const timer = window.setTimeout(() => { setLoaded(false); setStage(value => value + 1); }, 18000);
    return () => window.clearTimeout(timer);
  }, [visible, loaded, stage, sources]);
  useEffect(() => { if (stage >= sources.length) callback.current?.(true); }, [stage, sources.length]);
  const failed = stage >= sources.length;
  return <div ref={host} className={`gallery-photo ${className}`} data-state={failed ? 'failed' : loaded ? 'loaded' : 'loading'}>{!failed && visible && <img key={`${src}-${stage}`} src={sources[stage]} alt={alt} loading="lazy" decoding="async" onLoad={() => { setLoaded(true); callback.current?.(false); }} onError={() => { setLoaded(false); setStage(value => value + 1); }} />}{failed ? <span className="gallery-photo__failure"><ImageIcon /><span>Photo unavailable</span></span> : !loaded && <span className="gallery-photo__placeholder" aria-label="Loading photo" />}</div>;
}
