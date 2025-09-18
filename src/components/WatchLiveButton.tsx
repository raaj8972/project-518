import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LIVE_LEAD_MINUTES, INLINE_COUNTDOWN_THRESHOLD_MIN, COUNTDOWN_TICK_MS, fireLiveClick } from '../config/liveStream';

interface WatchLiveButtonProps {
  url: string;
  startTime: string | Date;
  leadMinutes?: number;
  className?: string;
  label?: string;
  /** Visual size of the button. xs=smallest, sm=default, md=slightly larger */
  size?: 'xs' | 'sm' | 'md';
  now?: number;
  showTooltip?: boolean;
  showCountdownChip?: boolean;
  inlineThresholdMinutes?: number;
  analytics?: boolean;
  fallbackLabel?: string;
  /** Force the button into LIVE state regardless of current time (e.g. admin manually opened or featured push). */
  forceLive?: boolean;
}

// States:
// Hidden (before lead), Disabled (within lead pre-start), Live (>= start)
export const WatchLiveButton: React.FC<WatchLiveButtonProps> = ({
  url,
  startTime,
  leadMinutes = LIVE_LEAD_MINUTES,
  className = '',
  label = 'Watch Live',
  size = 'sm',
  now,
  showTooltip = true,
  showCountdownChip = true,
  inlineThresholdMinutes = INLINE_COUNTDOWN_THRESHOLD_MIN,
  analytics = true,
  fallbackLabel = 'Watch Live',
  forceLive = false
}) => {
  if (!url || !startTime) return null;
  const startMs = typeof startTime === 'string' ? new Date(startTime).getTime() : startTime.getTime();
  if (Number.isNaN(startMs)) {
    return (
      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-semibold bg-gray-700/70 text-gray-300 ring-1 ring-white/10 ${className}`} title="Invalid start time provided">
        <span className="relative flex h-3 w-3"><span className="relative inline-flex rounded-full h-3 w-3 bg-gray-400" /></span>
        {fallbackLabel}
        <span className="text-[10px] uppercase tracking-wide ml-1 bg-black/30 px-1.5 py-0.5 rounded">TBD</span>
      </span>
    );
  }

  const [tick, setTick] = useState(0);
  const current = typeof now === 'number' ? now : Date.now();
  const effectiveNow = current + tick * 0;
  const leadMs = leadMinutes * 60 * 1000;
  const delta = startMs - effectiveNow;
  if (!forceLive && delta > leadMs) return null;
  const isLive = forceLive || delta <= 0;
  const secsToStart = Math.max(0, Math.floor(delta / 1000));
  const minsToStart = Math.floor(secsToStart / 60);
  const showInline = !isLive && minsToStart < inlineThresholdMinutes;

  useEffect(() => {
    if (isLive) return;
    const id = setInterval(() => setTick(t => (t + 1) % 1_000_000), COUNTDOWN_TICK_MS);
    return () => clearInterval(id);
  }, [isLive]);

  const countdownText = useMemo(() => {
    if (isLive) return 'LIVE';
    const m = Math.floor(secsToStart / 60);
    const s = secsToStart % 60;
    if (showInline) return `${m}:${s.toString().padStart(2,'0')}`;
    if (m >= 60) { const h = Math.floor(m / 60); const rm = m % 60; return `${h}h ${rm}m`; }
    if (m >= 10) return `${m}m`;
    if (m >= 1) return `${m}m ${s}s`;
    return `${s}s`;
  }, [secsToStart, isLive, showInline]);

  const sizePad = size === 'xs' ? 'px-2 py-0.5' : size === 'md' ? 'px-4 py-2' : 'px-3 py-1.5';
  const sizeText = size === 'xs' ? 'text-[9px]' : size === 'md' ? 'text-[12px]' : 'text-[11px]';
  const dotSize = size === 'xs' ? 'h-2 w-2' : size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3';
  /* Remove external drop-shadows to avoid casting on poster underneath */
  const baseClasses = `inline-flex items-center gap-2 ${sizePad} rounded-full ${sizeText} font-semibold transition-all ring-1 ring-white/20 relative overflow-hidden will-change-transform`;
  const liveClasses = forceLive
    ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-fuchsia-600 text-white hover:from-amber-400 hover:to-fuchsia-500 before:absolute before:inset-0 before:bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.15)_0_8px,rgba(255,255,255,0)_8px_16px)] before:opacity-30 before:pointer-events-none'
    : 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-400 hover:to-pink-400';
  const disabledClasses = 'bg-gradient-to-r from-gray-700 to-gray-600 text-gray-200/90 backdrop-blur-[2px] border border-white/10 cursor-not-allowed';
  const classes = `${baseClasses} ${isLive ? liveClasses : disabledClasses} hover:scale-[1.03] active:scale-[0.98] wlb ${isLive ? 'wlb-live' : 'wlb-wait'} ${className}`.trim();

  const tooltip = (() => {
    if (!showTooltip) return undefined;
    const d = new Date(startMs);
    try {
      const local = d.toLocaleString();
      const ist = d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      const utc = d.toUTCString();
      const baseLive = isLive
        ? `Live started • Local: ${local} • IST: ${ist} • UTC: ${utc}`
        : `Starts in ${countdownText} • Local: ${local} • IST: ${ist} • UTC: ${utc}`;
      if (forceLive) {
        return `EARLY ACCESS • ${baseLive}`;
      }
      return baseLive;
    } catch { return undefined; }
  })();

  const liveRegionRef = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    if (!isLive && liveRegionRef.current) { liveRegionRef.current.textContent = `Starts in ${countdownText}`; }
    if (isLive && liveRegionRef.current) { liveRegionRef.current.textContent = 'Live started'; }
  }, [countdownText, isLive]);

  // --- Expand/Collapse logic (used for LIVE state; provides auto-peek + hover/focus reveal) ---
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const revealRef = useRef<HTMLSpanElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const [revealWidth, setRevealWidth] = useState(120);

  useEffect(() => {
    const update = () => {
      if (measureRef.current) {
        const w = Math.ceil(measureRef.current.scrollWidth);
        if (w && w !== revealWidth) setRevealWidth(w);
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [revealWidth, label, countdownText, isLive]);

  // Auto-peek when live and not interacting
  useEffect(() => {
    if (!isLive || prefersReduced) return;
    let peekTimeout: number | undefined;
    const interval = window.setInterval(() => {
      if (hovered) return; // don't auto-peek while interacting
      setExpanded(true);
      // Close after a short reveal
      peekTimeout = window.setTimeout(() => setExpanded(false), 1600) as unknown as number;
    }, 7000);
    return () => {
      window.clearInterval(interval);
      if (peekTimeout) window.clearTimeout(peekTimeout);
    };
  }, [isLive, hovered, prefersReduced]);

  const handleEnter = () => { setHovered(true); setExpanded(true); };
  const handleLeave = () => { setHovered(false); setExpanded(false); };
  const handleTouch = () => {
    // Tap to peek for 1.5s on touch devices
    setExpanded(true);
    window.setTimeout(() => setExpanded(false), 1500);
  };

  const commonContent = (
    <span className="flex items-center">
      <span className={`relative flex ${dotSize} mr-1.5`}>
        {isLive && (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            {forceLive && <span className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-300 via-pink-200 to-fuchsia-300 opacity-70 mix-blend-screen" />}
          </>
        )}
        <span className={`relative inline-flex rounded-full ${dotSize} ${isLive ? (forceLive ? 'bg-white/90 ring-2 ring-amber-300' : 'bg-white') : 'bg-gray-300'}`} />
      </span>
      {/* Revealable content container */}
      <span
        ref={revealRef}
        className="overflow-hidden transition-all duration-500 ease-out flex items-center"
        style={{ maxWidth: expanded ? revealWidth : 0, opacity: expanded ? 1 : 0 }}
      >
        <span ref={measureRef} className="inline-flex items-center gap-2">
          <span>{label}</span>
          {!isLive && showCountdownChip && (
            <span className={`text-[10px] font-medium tracking-wide ml-1 px-1.5 py-0.5 rounded ${showInline ? 'bg-black/40 text-white/90' : 'bg-black/30 text-white/80'}`}>{countdownText}</span>
          )}
          {!isLive && !showCountdownChip && (
            <span className="text-[10px] font-normal uppercase tracking-wide ml-1 bg-black/30 px-1.5 py-0.5 rounded">Soon</span>
          )}
          {isLive && forceLive && (
            <span className="text-[9px] font-semibold uppercase tracking-wide ml-1 px-1 py-0.5 rounded bg-black/30 text-amber-200 ring-1 ring-amber-300/40">EARLY</span>
          )}
        </span>
      </span>
    </span>
  );

  if (!isLive) {
    return (
      <>
        <button
          type="button"
          className={classes}
          disabled
          title={tooltip || 'Live stream will unlock at start time'}
          aria-disabled="true"
        >
          {/* Waiting sheen (slow, subtle) */}
          <span aria-hidden className="wlb-sheen" />
          {commonContent}
          <span ref={liveRegionRef} className="sr-only" aria-live="polite" />
        </button>
        <style>{`
          .wlb { position: relative; isolation: isolate; }
          .wlb .wlb-sheen { position:absolute; inset:-20%; background: linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.08) 35%, transparent 50%); transform: translateX(-60%); animation: wlbSheen 4.5s ease-in-out infinite; pointer-events:none; }
          /* Remove heavy drop-shadow so poster under button has no dark halo */
          .wlb-wait { filter: none; }
          @keyframes wlbSheen { 0%, 35% { transform: translateX(-60%); } 50% { transform: translateX(70%); } 100% { transform: translateX(70%); } }
        `}</style>
      </>
    );
  }

  const onClick = () => {
    if (analytics) {
      fireLiveClick({ url, startTime: new Date(startMs).toISOString(), isLive: true, isForcedLive: forceLive });
    }
  };

  return (
    <>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${classes} group`}
        aria-label={label}
        title={tooltip}
        onClick={onClick}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleEnter}
        onBlur={handleLeave}
        onTouchStart={handleTouch}
      >
        {/* Live animated background shift */}
        <span aria-hidden className="wlb-bg" />
        {/* Hover sweep */}
        <span className="absolute -inset-[120%] bg-[conic-gradient(from_90deg,rgba(255,255,255,0.08),transparent_30%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        {commonContent}
        <span ref={liveRegionRef} className="sr-only" aria-live="polite" />
      </a>
      <style>{`
  .wlb { position: relative; isolation: isolate; }
  /* Remove live-state drop-shadows so nothing darkens the poster behind */
  .wlb-live { filter: none; }
        .wlb-live::after { content:''; position:absolute; inset:-2px; border-radius:9999px; background: radial-gradient(60% 60% at 50% 50%, rgba(255,255,255,0.25), transparent 70%); animation: wlbPulse 2.4s ease-in-out infinite; pointer-events:none; z-index:-1; filter: blur(8px);
        }
        .wlb .wlb-bg { position:absolute; inset:0; border-radius:9999px; background: linear-gradient(90deg, rgba(255,0,128,0.15), rgba(0,255,255,0.12), rgba(255,0,128,0.15)); background-size:200% 200%; animation: wlbGradient 4s ease-in-out infinite; mix-blend: screen; pointer-events:none; }
        @keyframes wlbGradient { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        @keyframes wlbPulse { 0%,100% { opacity: 0.28; transform: scale(0.98); } 50% { opacity: 0.55; transform: scale(1.03); } }
      `}</style>
    </>
  );
};

export default WatchLiveButton;
