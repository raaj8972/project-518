import { useEffect, useRef, useState, type VideoHTMLAttributes } from 'react';

/** Load a motion poster when it reaches the viewport; pause it when it leaves. */
export function LazyVideo({ src, ...props }: VideoHTMLAttributes<HTMLVideoElement>) {
  const ref = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); setLoaded(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
      if (entry.isIntersecting) setLoaded(true);
    }, { rootMargin: '100px' });
    observer.observe(video);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const update = () => {
      const video = ref.current;
      if (!video) return;
      if (visible && !document.hidden) void video.play().catch(() => {});
      else video.pause();
    };
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, [visible, src, loaded]);
  return <video {...props} ref={ref} src={loaded ? src : undefined} autoPlay={visible} preload="metadata" />;
}
