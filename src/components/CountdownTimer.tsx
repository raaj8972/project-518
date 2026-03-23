import React from 'react';

function formatTime(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { days, hours, minutes, seconds };
}

const pad = (n: number) => String(n).padStart(2, '0');

export const CountdownTimer: React.FC<{
  target: Date | string | number | null | undefined;
  className?: string;
  onDone?: () => void;
  endedText?: string; // text to show when countdown has finished
  showEnded?: boolean; // whether to render ended text instead of 00:00:00:00
  hideAfterMs?: number; // when ended, render nothing after this elapsed time
  liveLink?: string; // optional link to show next to endedText (e.g., Watch live)
  liveLinkText?: string;
  // visual tweaks
  neon?: boolean;
  size?: 'md' | 'lg' | 'xl';
}> = ({ target, className = '', onDone, endedText = 'LIVE NOW', showEnded = true, hideAfterMs = 0, liveLink, liveLinkText = 'Watch live', neon = false, size = 'md' }) => {
  const [msLeft, setMsLeft] = React.useState<number>(0);
  const endTsRef = React.useRef<number | null>(null);
  const doneRef = React.useRef<boolean>(false);

  React.useEffect(() => {
    let t: number | null = null;
    // compute and store target timestamp once per prop change
    const endTs = target ? new Date(target).getTime() : NaN;
    endTsRef.current = isNaN(endTs) ? null : endTs;
    const compute = () => {
      const now = Date.now();
      const end = endTsRef.current;
      const left = end == null ? 0 : Math.max(0, end - now);
      setMsLeft(left);
      if (end != null && left === 0) {
        const sinceEnd = now - end;
        if (hideAfterMs > 0) {
          if (sinceEnd >= hideAfterMs && onDone && !doneRef.current) {
            doneRef.current = true;
            onDone();
          }
        } else if (onDone && !doneRef.current) {
          doneRef.current = true;
          onDone();
        }
      }
    };
    compute();
    const id = window.setInterval(compute, 1000);
    t = id;
    return () => {
      if (t) window.clearInterval(t);
    };
  }, [target, onDone, hideAfterMs]);

  const { days, hours, minutes, seconds } = formatTime(msLeft);

  // Size presets
  const sizeCfg = ((): { num: string; label: string; pad: string; colon: string } => {
    switch (size) {
      case 'lg':
        return { num: 'text-2xl md:text-3xl lg:text-3xl', label: 'text-[11px] md:text-[12px] lg:text-[11px]', pad: 'px-3 py-2 md:px-4 md:py-2.5 lg:px-4 lg:py-2', colon: 'text-2xl md:text-3xl lg:text-3xl' };
      case 'xl':
        return { num: 'text-3xl md:text-4xl lg:text-5xl', label: 'text-xs md:text-sm lg:text-sm', pad: 'px-4 py-2.5 md:px-5 md:py-3 lg:px-6 lg:py-3', colon: 'text-3xl md:text-4xl lg:text-5xl' };
      default:
        return { num: 'text-lg md:text-xl lg:text-xl', label: 'text-[10px] md:text-[11px] lg:text-[10px]', pad: 'px-2 py-1 md:px-3 md:py-2 lg:px-2.5 lg:py-1.5', colon: 'text-xl md:text-xl lg:text-lg' };
    }
  })();

  if (msLeft === 0) {
    const end = endTsRef.current;
    const sinceEnd = end == null ? 0 : Date.now() - end;
    if (hideAfterMs > 0 && sinceEnd >= hideAfterMs) {
      return null;
    }
    if (showEnded) {
    return (
        <div className={`inline-flex items-center gap-3 font-mono ${neon ? 'drop-shadow-[0_0_16px_rgba(239,68,68,0.35)]' : ''} ${className}`} aria-live="polite">
          <span className="px-2 py-1 rounded-md bg-red-500/20 text-red-300 border border-red-400/40 text-sm font-semibold ring-1 ring-red-400/40 animate-pulse">
            {endedText}
          </span>
          {liveLink && (
            <a
              href={liveLink}
              target="_blank"
              rel="noopener noreferrer"
                className="px-2 py-1 rounded-md bg-white/10 text-white border border-white/20 text-xs hover:bg-white/15 hover:border-white/30 transition-colors"
            >
              {liveLinkText}
            </a>
          )}
      </div>
    );
    }
  }

  return (
    // Group into two no-wrap pairs so the colon never dangles at the line end when wrapping
  <div className={`flex flex-nowrap items-center gap-x-3 lg:gap-x-3 font-mono lg:scale-95 ${neon ? 'drop-shadow-[0_0_18px_rgba(239,68,68,0.25)]' : ''} ${className}`} aria-live="polite">
      <div className="flex items-center gap-2 lg:gap-2 whitespace-nowrap">
        <TimeBlock label="D" value={days} highlight={days <= 1} neon={neon} sizeCfg={sizeCfg} />
        <span className={`opacity-70 leading-none ${sizeCfg.colon} ${neon ? 'drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]' : ''}`}>:</span>
        <TimeBlock label="H" value={hours} neon={neon} sizeCfg={sizeCfg} />
      </div>
      <div className="flex items-center gap-2 lg:gap-2 whitespace-nowrap">
        <TimeBlock label="M" value={minutes} neon={neon} sizeCfg={sizeCfg} />
        <span className={`opacity-70 leading-none ${sizeCfg.colon} ${neon ? 'drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]' : ''}`}>:</span>
        <TimeBlock label="S" value={seconds} neon={neon} sizeCfg={sizeCfg} />
      </div>
    </div>
  );
};

const TimeBlock: React.FC<{ label: string; value: number; highlight?: boolean; neon?: boolean; sizeCfg: { num: string; label: string; pad: string } }> = ({ label, value, highlight, neon, sizeCfg }) => (
  <div className={`${sizeCfg.pad} rounded-lg md:rounded-xl text-white shadow 
    ${neon
      ? 'bg-gradient-to-b from-red-500/10 via-white/5 to-orange-400/10 border border-white/15 ring-1 ring-white/10 shadow-[0_0_20px_rgba(239,68,68,0.2),0_0_28px_rgba(239,68,68,0.18)]'
      : 'bg-black/40 border border-white/10'} 
    ${highlight ? (neon ? 'ring-2 ring-red-400/40' : 'ring-1 ring-red-400/50') : ''}
  `}>
    <div className={`${sizeCfg.num} tabular-nums tracking-wider ${neon ? 'drop-shadow-[0_0_10px_rgba(255,255,255,0.45)]' : ''}`}>
      {pad(value)}
    </div>
    <div className={`${sizeCfg.label} uppercase opacity-80 text-center -mt-0.5`}>{label}</div>
  </div>
);

export default CountdownTimer;
