import { useEffect, useState } from 'react';
import './ScrollHint.css';

export default function ScrollHint() {
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    // Respect explicit opt-out on pages (e.g. homepage can set <body data-no-scroll-hint>)
    try {
      const body = document.body;
      if (body && body.getAttribute('data-no-scroll-hint') !== null) return;
    } catch (e) {
      // ignore
    }

    // Only show on mobile widths
    if (window.innerWidth > 768) return;

    // Use an in-memory, per-path seen map on window so dismissal is per-page
    // during the current browsing session. This allows the hint to re-appear
    // after a full page refresh while remaining dismissed for the page until
    // the user refreshes.
    try {
      (window as any).__rcScrollHintSeen = (window as any).__rcScrollHintSeen || {};
    } catch (e) {
      // ignore
    }
    const pathname = (typeof window !== 'undefined' && window.location && window.location.pathname) ? window.location.pathname : '/';
    const seen = (window as any).__rcScrollHintSeen && (window as any).__rcScrollHintSeen[pathname];
    if (seen) return;

    // Small delay so the page settles
    const t = setTimeout(() => setVisible(true), 600);

    let dismissing = false;
    const onDismiss = () => {
      if (dismissing) return; // Prevent multiple dismissals
      dismissing = true;
      
      // Mark this pathname as seen for the current session (in-memory)
      try { 
        (window as any).__rcScrollHintSeen = (window as any).__rcScrollHintSeen || {}; 
        (window as any).__rcScrollHintSeen[pathname] = true; 
      } catch (e) { /* ignore */ }
      
      // Start fade-out animation
      setFadingOut(true);
      
      // Remove listeners immediately to avoid extra work after dismiss
      try {
        window.removeEventListener('scroll', onDismiss);
        window.removeEventListener('touchstart', onDismiss);
        window.removeEventListener('touchmove', onDismiss);
        window.removeEventListener('wheel', onDismiss);
      } catch (e) {
        /* ignore */
      }
      
      // Complete hide after animation
      setTimeout(() => setVisible(false), 300);
    };

    // Listen to multiple events to ensure we catch the scroll
    window.addEventListener('scroll', onDismiss, { passive: true });
    window.addEventListener('touchstart', onDismiss, { passive: true });
    window.addEventListener('touchmove', onDismiss, { passive: true });
    window.addEventListener('wheel', onDismiss, { passive: true });

    return () => {
      clearTimeout(t);
      window.removeEventListener('scroll', onDismiss);
      window.removeEventListener('touchstart', onDismiss);
      window.removeEventListener('touchmove', onDismiss);
      window.removeEventListener('wheel', onDismiss);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <div className={`rc-scroll-hint ${fadingOut ? 'rc-scroll-hint--fadeout' : ''}`} role="status" aria-hidden="false">
      <div className="rc-scroll-hint__card">
        <div className="rc-scroll-hint__icon" aria-hidden>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
            <path d="M19 12l-7 7-7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="rc-scroll-hint__text">Swipe to explore</div>
      </div>
    </div>
  );
}
