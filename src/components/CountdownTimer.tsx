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
}> = ({ target, className = '', onDone, endedText = 'LIVE NOW', showEnded = true, hideAfterMs = 0, liveLink, liveLinkText = 'Watch live' }) => {
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

  if (msLeft === 0) {
    const end = endTsRef.current;
    const sinceEnd = end == null ? 0 : Date.now() - end;
    if (hideAfterMs > 0 && sinceEnd >= hideAfterMs) {
      return null;
    }
    if (showEnded) {
    return (
        <div className={`inline-flex items-center gap-3 font-mono ${className}`} aria-live="polite">
          <span className="px-2 py-1 rounded-md bg-pink-500/20 text-pink-300 border border-pink-400/40 text-sm font-semibold ring-1 ring-pink-400/40 animate-pulse">
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
  <div className={`flex flex-nowrap items-center gap-x-3 lg:gap-x-3 font-mono lg:scale-95 ${className}`} aria-live="polite">
      <div className="flex items-center gap-2 lg:gap-2 whitespace-nowrap">
        <TimeBlock label="D" value={days} highlight={days <= 1} />
        <span className="opacity-60 text-xl md:text-xl lg:text-lg leading-none">:</span>
        <TimeBlock label="H" value={hours} />
      </div>
      <div className="flex items-center gap-2 lg:gap-2 whitespace-nowrap">
        <TimeBlock label="M" value={minutes} />
        <span className="opacity-60 text-xl md:text-xl lg:text-lg leading-none">:</span>
        <TimeBlock label="S" value={seconds} />
      </div>
    </div>
  );
};

const TimeBlock: React.FC<{ label: string; value: number; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className={`px-2 py-1 md:px-3 md:py-2 lg:px-2.5 lg:py-1.5 rounded-lg md:rounded-xl bg-black/40 border border-white/10 text-white shadow ${highlight ? 'ring-1 ring-pink-400/50' : ''}`}>
    <div className="text-lg md:text-xl lg:text-xl tabular-nums tracking-wider">
      {pad(value)}
    </div>
    <div className="text-[10px] md:text-[11px] lg:text-[10px] uppercase opacity-70 text-center -mt-0.5">{label}</div>
  </div>
);

export default CountdownTimer;
