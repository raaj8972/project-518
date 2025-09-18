import React from 'react';

type Props = {
  src?: string | null;
  alt?: string;
  size?: number; // height in px; width auto
  glowStrength?: number; // 0..2 typical; scales neon glow
  glowColor?: string; // hex or rgba; overrides theme pink/cyan blend with a single color
  className?: string;
  animated?: boolean; // enable subtle float/pulse + fade-in
};

// A lightweight 3D-styled logo renderer that adapts to the site's neon theme
// - Adds subtle perspective/tilt on hover
// - Applies a soft pink→cyan glow by default (respects transparency for PNGs)
// - Falls back to text logo if src missing
export const BrandLogo3D: React.FC<Props> = ({ src, alt = 'Brand', size = 32, glowStrength = 1, glowColor, className = '', animated = true }) => {
  const height = Math.max(20, size);
  const styleVars: React.CSSProperties = {
    ['--brand-glow-a' as any]: glowColor ? glowColor : 'rgba(255,0,255,0.55)',
    ['--brand-glow-b' as any]: glowColor ? glowColor : 'rgba(0,255,255,0.55)',
    ['--brand-shadow' as any]: 'rgba(0,0,0,0.35)',
    ['--brand-glow-scale' as any]: String(Math.max(0, Math.min(2, glowStrength)))
  };

  return (
    <span className={`inline-flex items-center select-none ${className}`} style={styleVars}>
      {src ? (
        <span className={`brand3d-wrap ${animated ? 'brand3d-animated' : ''}`} style={{ height, width: height, '--h': `${height}px` } as any}>
          <img
            src={src}
            alt={alt}
            decoding="async"
            loading="eager"
            className="brand3d-img"
            style={{ height, width: 'auto' }}
          />
        </span>
      ) : (
        <span className="brand3d-fallback" style={{ fontSize: Math.round(height*0.8) }}>
          R
        </span>
      )}
      <style>{`
        .brand3d-wrap { position: relative; display: inline-flex; align-items:center; justify-content:center; aspect-ratio:1/1; perspective: 700px; }
    .brand3d-img { display:block; filter:
      drop-shadow(0 1px 0 var(--brand-shadow))
      drop-shadow(0 0 calc(8px * var(--brand-glow-scale)) var(--brand-glow-a))
      drop-shadow(0 0 calc(12px * var(--brand-glow-scale)) var(--brand-glow-b));
          transform: rotateX(0deg) rotateY(0deg) translateZ(0);
          transition: transform 320ms ease, filter 320ms ease; will-change: transform;
        }
    .brand3d-wrap:hover .brand3d-img, .brand3d-wrap:focus .brand3d-img { transform: rotateX(8deg) rotateY(-8deg) translateZ(6px); filter:
      drop-shadow(0 1px 0 var(--brand-shadow))
      drop-shadow(0 0 calc(10px * var(--brand-glow-scale)) var(--brand-glow-a))
      drop-shadow(0 0 calc(18px * var(--brand-glow-scale)) var(--brand-glow-b)); }
        .brand3d-fallback { font-weight: 900; background: linear-gradient(45deg,#ff00ff,#00ffff,#ff00ff); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; animation: brandGrad 3s ease-in-out infinite; display:inline-block; line-height:1; }
        @keyframes brandGrad { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }

        /* Subtle float + fade-in animations when animated=true */
        .brand3d-animated { animation: brandFadeIn 600ms ease-out forwards, brandFloat 6s ease-in-out 400ms infinite; }
        .brand3d-animated .brand3d-img { animation: brandPulse 3200ms ease-in-out 400ms infinite; }
        @keyframes brandFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes brandFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-1.6px); } }
        @keyframes brandPulse { 0%,100% { opacity: 0.96; } 50% { opacity: 1; } }

        /* Respect reduced motion preferences */
        @media (prefers-reduced-motion: reduce) {
          .brand3d-animated, .brand3d-animated .brand3d-img { animation: none !important; }
        }
      `}</style>
    </span>
  );
};

export default BrandLogo3D;
