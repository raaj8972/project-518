import { useEffect, useState } from 'react';

export function ArtistStageImage({ src, alt, className = '' }: {src: string; alt: string; className?: string}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const panel = src.match(/#panel-(left|center|right)$/)?.[1];
  const photoY = src.includes('performers-2.') ? '24%' : '42%';
  if (failed || !src) return <span className={`artist-stage-image-fallback ${className}`} role="img" aria-label={alt}>R<span>LIVE ON STAGE</span></span>;
  if (panel) return <span role="img" aria-label={alt} className={`artist-stage-demo-photo ${className}`} style={{backgroundImage: `url("${src.split('#')[0]}")`, backgroundPosition: `${panel === 'left' ? '0%' : panel === 'right' ? '100%' : '50%'} ${photoY}`}}/>;
  return <img src={src} alt={alt} className={className} loading="lazy" decoding="async" onError={() => setFailed(true)}/>;
}
