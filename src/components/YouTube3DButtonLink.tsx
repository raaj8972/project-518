import React from 'react';

type Props = {
  href: string;
  ariaLabel?: string;
  className?: string;
  iconSize?: number; // default 28-32
  buttonSize?: number; // default 40-48
  external?: boolean; // default true
  showPulse?: boolean; // default true
};

const YouTube3DIcon: React.FC<{ size?: number; className?: string }> = ({ size = 32, className }) => (
  <svg
    className={className ? className + ' yt-3d' : 'yt-3d'}
    viewBox="0 0 24 24"
    width={size}
    height={size}
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="ytGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF0000" />
        <stop offset="100%" stopColor="#CC0000" />
      </linearGradient>
    </defs>
    {/* Rounded rectangle YouTube badge */}
    <rect x="1" y="4" width="22" height="16" rx="4.5" fill="url(#ytGrad)" />
    {/* Play triangle */}
    <path d="M10 9l6 3-6 3V9z" fill="#fff" />
  </svg>
);

export const YouTube3DButtonLink: React.FC<Props> = ({
  href,
  ariaLabel = 'YouTube channel',
  className = '',
  iconSize = 32,
  buttonSize = 48,
  external = true,
  showPulse = true,
}) => {
  const rel = external ? 'noopener noreferrer' : undefined;
  const target = external ? '_blank' : undefined;
  const sizeStyle: React.CSSProperties = { width: buttonSize, height: buttonSize };

  return (
    <a
      href={href}
      target={target}
      rel={rel}
      aria-label={ariaLabel}
      className={
        'group inline-flex items-center justify-center rounded-full ring-1 ring-white/10 hover:ring-white/25 transition-all duration-300 hover:scale-110 relative overflow-visible ' +
        className
      }
      style={sizeStyle}
    >
      {/* red glow halo */}
      <span
        className="absolute inset-0 rounded-full opacity-70 blur-md"
        style={{ background: 'radial-gradient(45% 45% at 50% 50%, rgba(255,0,0,0.38), rgba(204,0,0,0.25) 60%, rgba(128,0,0,0.15) 85%, transparent)' }}
      />
      {showPulse && (
        <span className="absolute inset-[-6px] rounded-full border border-red-400/25 scale-90 opacity-0 group-hover:opacity-100 group-hover:animate-pulse" />
      )}
      <YouTube3DIcon size={iconSize} />
      <style>{`
        @keyframes ytFloat { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-3px) rotate(-2.5deg); } }
        .yt-3d {
          animation: ytFloat 4.5s ease-in-out infinite;
          filter: drop-shadow(0 8px 18px rgba(255,0,0,0.35)) drop-shadow(0 3px 8px rgba(0,0,0,0.38));
          transition: transform 220ms ease, filter 220ms ease;
          will-change: transform, filter;
        }
        .group:hover .yt-3d {
          transform: translateY(-2px) rotate(-8deg) scale(1.12);
          filter: drop-shadow(0 14px 24px rgba(255,0,0,0.45)) drop-shadow(0 6px 12px rgba(0,0,0,0.5));
        }
      `}</style>
    </a>
  );
};

export default YouTube3DButtonLink;
