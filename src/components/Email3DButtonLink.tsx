import React from 'react';

type Props = {
  href: string; // mailto: link
  ariaLabel?: string;
  className?: string;
  iconSize?: number; // default 32
  buttonSize?: number; // default 48
  external?: boolean; // whether to open new tab; for mailto usually false
  showPulse?: boolean; // default true
  variant?: 'solid' | 'ring'; // visual style
};

const Email3DIcon: React.FC<{ size?: number; className?: string }> = ({ size = 32, className }) => (
  <svg
    className={className ? className + ' email-3d' : 'email-3d'}
    viewBox="0 0 24 24"
    width={size}
    height={size}
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="emailGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00E5FF" />
        <stop offset="100%" stopColor="#2979FF" />
      </linearGradient>
    </defs>
    <rect x="1" y="3" width="22" height="18" rx="5" fill="url(#emailGrad)" />
    <path d="M3.5 6.5l8.5 6 8.5-6" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 18h16" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="0.8" />
  </svg>
);

export const Email3DButtonLink: React.FC<Props> = ({
  href,
  ariaLabel = 'Send email',
  className = '',
  iconSize = 32,
  buttonSize = 48,
  external = false,
  showPulse = true,
  variant = 'solid',
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
        'group inline-flex items-center justify-center rounded-full ring-1 ring-white/10 hover:ring-white/25 transition-all duration-300 hover:scale-110 active:scale-95 relative overflow-visible ' +
        className
      }
      style={sizeStyle}
    >
      {variant === 'solid' ? (
        <span
          className="absolute inset-0 rounded-full opacity-70 blur-md"
          style={{
            background:
              'radial-gradient(45% 45% at 50% 50%, rgba(41,121,255,0.34), rgba(0,229,255,0.22) 60%, rgba(0,140,255,0.12) 85%, transparent)',
          }}
        />
      ) : (
        <span
          className="absolute inset-0 rounded-full opacity-80"
          style={{
            background:
              'conic-gradient(from 0deg, rgba(0,229,255,0.25), rgba(41,121,255,0.35), rgba(0,229,255,0.25))',
            WebkitMask:
              'radial-gradient(circle, transparent 58%, black 59%)',
            mask: 'radial-gradient(circle, transparent 58%, black 59%)',
            filter: 'blur(6px)'
          }}
        />
      )}
      {showPulse && (
        <span className="absolute inset-[-6px] rounded-full border border-sky-400/25 scale-90 opacity-0 group-hover:opacity-100 group-hover:animate-pulse" />
      )}
  <Email3DIcon size={iconSize} />
      <style>{`
        @keyframes emailFloat { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-3px) rotate(3deg); } }
        .email-3d {
          animation: emailFloat 4.5s ease-in-out infinite;
          filter: drop-shadow(0 8px 18px rgba(0, 229, 255, 0.32)) drop-shadow(0 3px 8px rgba(0,0,0,0.38));
          transition: transform 220ms ease, filter 220ms ease;
          will-change: transform, filter;
        }
        .group:hover .email-3d { transform: translateY(-2px) rotate(8deg) scale(1.12); filter: drop-shadow(0 14px 24px rgba(41,121,255,0.42)) drop-shadow(0 6px 12px rgba(0,0,0,0.5)); }
      `}</style>
    </a>
  );
};

export default Email3DButtonLink;
