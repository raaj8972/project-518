import { useId } from 'react';

export function SocialBrandIcon({ platform, size = 16 }: { platform: 'instagram' | 'facebook'; size?: number }) {
  const id = useId();
  return platform === 'instagram'
    ? <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="family-social-brand-icon">
      <defs><linearGradient id={`${id}-instagram`} x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse"><stop stopColor="#f8bd5c"/><stop offset=".4" stopColor="#ef567f"/><stop offset=".75" stopColor="#be4eb4"/><stop offset="1" stopColor="#805ad5"/></linearGradient></defs>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke={`url(#${id}-instagram)`} strokeWidth="2"/>
      <circle cx="12" cy="12" r="4" stroke={`url(#${id}-instagram)`} strokeWidth="2"/>
      <circle cx="17.5" cy="6.5" r="1.2" fill="#bd58bb"/>
    </svg>
    : <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="family-social-brand-icon"><circle cx="12" cy="12" r="11" fill="#1877f2"/><path fill="#fff" d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.5 1.6-1.5h1.6V4.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1V11H7.6v3h2.7v8z"/></svg>;
}
