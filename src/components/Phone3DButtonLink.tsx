import React from 'react';

type Props = {
  href: string; // tel: link
  ariaLabel?: string;
  className?: string;
  iconSize?: number; // default 30-32
  buttonSize?: number; // default 46-52
  external?: boolean; // for tel usually false
  showPulse?: boolean; // default true
  variant?: 'solid' | 'ring';
};

const Phone3DIcon: React.FC<{ size?: number; className?: string }> = ({ size = 30, className }) => (
  <svg
    className={className ? className + ' phone-3d' : 'phone-3d'}
    viewBox="0 0 24 24"
    width={size}
    height={size}
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="phoneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00E676" />
        <stop offset="100%" stopColor="#00C853" />
      </linearGradient>
    </defs>
    {/* Circular neon badge */}
    <circle cx="12" cy="12" r="10" fill="url(#phoneGrad)" />
    {/* Handset (feather-style) */}
    <path
      d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.09 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.82.34 1.61.65 2.35a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.73-1.73a2 2 0 0 1 2.11-.45c.74.31 1.53.53 2.35.65A2 2 0 0 1 22 16.92z"
      fill="none"
      stroke="#ffffff"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Phone3DButtonLink: React.FC<Props> = ({
  href,
  ariaLabel = 'Call phone number',
  className = '',
  iconSize = 30,
  buttonSize = 46,
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
      {/* glow or ring style */}
      {variant === 'solid' ? (
        <span
          className="absolute inset-0 rounded-full opacity-70 blur-md"
          style={{ background: 'radial-gradient(45% 45% at 50% 50%, rgba(0,230,118,0.35), rgba(0,200,83,0.22) 60%, rgba(0,150,60,0.12) 85%, transparent)' }}
        />
      ) : (
        <span
          className="absolute inset-0 rounded-full opacity-80"
          style={{
            background: 'conic-gradient(from 0deg, rgba(0,230,118,0.25), rgba(0,200,83,0.35), rgba(0,230,118,0.25))',
            WebkitMask: 'radial-gradient(circle, transparent 58%, black 59%)',
            mask: 'radial-gradient(circle, transparent 58%, black 59%)',
            filter: 'blur(6px)'
          }}
        />
      )}
      {showPulse && (
        <span className="absolute inset-[-6px] rounded-full border border-emerald-400/25 scale-90 opacity-0 group-hover:opacity-100 group-hover:animate-pulse" />
      )}
      <Phone3DIcon size={iconSize} />
      <style>{`
        @keyframes phoneFloat { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-3px) rotate(-3deg); } }
        .phone-3d {
          animation: phoneFloat 4.5s ease-in-out infinite;
          filter: drop-shadow(0 8px 18px rgba(0, 230, 118, 0.32)) drop-shadow(0 3px 8px rgba(0,0,0,0.38));
          transition: transform 220ms ease, filter 220ms ease;
          will-change: transform, filter;
        }
        .group:hover .phone-3d { transform: translateY(-2px) rotate(-8deg) scale(1.12); filter: drop-shadow(0 14px 24px rgba(0, 230, 118, 0.42)) drop-shadow(0 6px 12px rgba(0,0,0,0.5)); }
      `}</style>
    </a>
  );
};

export default Phone3DButtonLink;
