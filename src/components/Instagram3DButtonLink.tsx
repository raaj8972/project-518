import React from 'react';

type Props = {
  href: string;
  ariaLabel?: string;
  className?: string;
  /** Icon size in px (square). Default 32 */
  iconSize?: number;
  /** Button size in px (square). Default 48 */
  buttonSize?: number;
  /** Open in new tab and add rel noopener. Default true */
  external?: boolean;
  /** Show hover pulse ring. Default true */
  showPulse?: boolean;
};

const Instagram3DIcon: React.FC<{ size?: number; className?: string }> = ({ size = 32, className }) => (
  <svg
    className={className ? className + ' ig-3d' : 'ig-3d'}
    viewBox="0 0 24 24"
    width={size}
    height={size}
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="igGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F58529" />
        <stop offset="35%" stopColor="#DD2A7B" />
        <stop offset="65%" stopColor="#8134AF" />
        <stop offset="100%" stopColor="#515BD4" />
      </linearGradient>
    </defs>
    <rect x="1" y="1" width="22" height="22" rx="6" fill="url(#igGrad)" />
    <g fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6.2" y="6.2" width="11.6" height="11.6" rx="3.2" />
      <circle cx="12" cy="12" r="3.3" />
    </g>
    <circle cx="16.3" cy="7.7" r="1.1" fill="#fff" />
  </svg>
);

export const Instagram3DButtonLink: React.FC<Props> = ({
  href,
  ariaLabel = 'Instagram profile',
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
      <span
        className="absolute inset-0 rounded-full opacity-70 blur-md"
        style={{
          background:
            'radial-gradient(45% 45% at 50% 50%, rgba(221,42,123,0.35), rgba(129,52,175,0.22) 55%, rgba(81,91,212,0.12) 85%, transparent)',
        }}
      />
      {showPulse && (
        <span className="absolute inset-[-6px] rounded-full border border-pink-400/20 scale-90 opacity-0 group-hover:opacity-100 group-hover:animate-pulse" />
      )}
      <Instagram3DIcon size={iconSize} className="social-3d-icon" />
    </a>
  );
};

export default Instagram3DButtonLink;
