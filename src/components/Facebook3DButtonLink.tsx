import React from 'react';

type Props = {
  href: string;
  ariaLabel?: string;
  className?: string;
  iconSize?: number;
  buttonSize?: number;
  external?: boolean;
  showPulse?: boolean;
};

const Facebook3DIcon: React.FC<{ size?: number; className?: string }> = ({ size = 32, className }) => (
  <svg
    className={className ? className + ' fb-3d' : 'fb-3d'}
    viewBox="0 0 24 24"
    width={size}
    height={size}
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="fbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4E73D6" />
        <stop offset="60%" stopColor="#3B5998" />
        <stop offset="100%" stopColor="#2E4A86" />
      </linearGradient>
      <linearGradient id="fbHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
      </linearGradient>
    </defs>

    {/* Rounded background with subtle inner bevel */}
    <rect x="1" y="1" width="22" height="22" rx="6" fill="url(#fbGrad)" />
    <rect x="1" y="1" width="22" height="22" rx="6" fill="url(#fbHighlight)" opacity="0.14" />

    {/* Crisp 'f' glyph - designed for clarity at small sizes */}
    <g fill="#fff" transform="translate(0,0)">
      <path d="M15.5 7.5h-1.6c-.4 0-.9.2-.9.9v1.2h2.5l-.3 2.3h-2.2V19h-2.7v-7.1H8.7v-2.3h1.6V8.6c0-1.8 1.1-2.9 2.8-2.9.8 0 1.6.1 1.9.2v1.6z" />
    </g>

    {/* subtle inner shadow to add depth */}
    <path d="M2 6c0-2 1.5-4 4-4h12c2.5 0 4 1.8 4 4v8c0 2-1.5 4-4 4H6c-2.5 0-4-1.8-4-4V6z" fill="none" stroke="rgba(0,0,0,0.09)" strokeWidth="0.8" />
  </svg>
);

const Facebook3DButtonLink: React.FC<Props> = ({
  href,
  ariaLabel = 'Facebook profile',
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
      {/* matching overlay and pulse structure to Instagram for visual parity */}
      <span
        className="absolute inset-0 rounded-full opacity-70 blur-md"
        style={{
          background:
            'radial-gradient(45% 45% at 50% 50%, rgba(76,105,186,0.30), rgba(59,89,152,0.18) 55%, transparent 85%)',
        }}
      />
      {showPulse && (
        <span className="absolute inset-[-6px] rounded-full border border-blue-400/20 scale-90 opacity-0 group-hover:opacity-100 group-hover:animate-pulse" />
      )}
      <div className="flex items-center justify-center">
        <Facebook3DIcon size={iconSize} />
      </div>
      <style>{`
        @keyframes fbFloat { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-2px) rotate(1.6deg); } }
        .fb-3d {
          animation: fbFloat 4.5s ease-in-out infinite;
          filter: drop-shadow(0 8px 18px rgba(59,89,152,0.28)) drop-shadow(0 3px 8px rgba(0,0,0,0.32));
          transition: transform 220ms ease, filter 220ms ease;
          will-change: transform, filter;
        }
        .group:hover .fb-3d {
          transform: translateY(-2px) rotate(8deg) scale(1.12);
          filter: drop-shadow(0 14px 24px rgba(59,89,152,0.36)) drop-shadow(0 6px 12px rgba(0,0,0,0.44));
        }
      `}</style>
    </a>
  );
};

export default Facebook3DButtonLink;
