import { useEffect, useRef, useState, type CSSProperties } from 'react';
import './IntroWebWipe.css';

export const INTRO_WEB_WIPE_MS = 1100;
export const INTRO_WEB_COVER_FRACTION = .5;

type Props = {
  running: boolean;
  paused: boolean;
  onCovered: () => void;
  onComplete: () => void;
  durationMs?: number;
};

/** Silk closes over the title, then peels away from the already-mounted film. */
export default function IntroWebWipe({ running, paused, onCovered, onComplete, durationMs = INTRO_WEB_WIPE_MS }: Props) {
  const [phase, setPhase] = useState<'shooting' | 'clearing' | 'complete'>('shooting');
  const [hidden, setHidden] = useState(() => document.hidden);
  const callbacks = useRef({ onCovered, onComplete });
  callbacks.current = { onCovered, onComplete };
  const pauseState = useRef(paused);
  pauseState.current = paused;
  const syncTimer = useRef<() => void>(() => {});
  const duration = Math.max(1, durationMs);

  useEffect(() => {
    const texture = new Image();
    texture.decoding = 'async';
    texture.src = '/images/effects/real-silk-web.webp';
  }, []);

  useEffect(() => {
    if (!running) return;
    let disposed = false, covered = false, finished = false;
    let elapsed = 0, started = 0, timer: ReturnType<typeof setTimeout> | undefined;
    const coverAt = duration * INTRO_WEB_COVER_FRACTION;
    setPhase('shooting');
    const stop = () => {
      if (timer === undefined) return;
      elapsed = Math.min(duration, elapsed + Math.max(0, performance.now() - started));
      clearTimeout(timer); timer = undefined;
    };
    const schedule = () => {
      if (disposed || finished || pauseState.current || document.hidden) return;
      const target = covered ? duration : coverAt;
      started = performance.now();
      timer = setTimeout(() => {
        timer = undefined; elapsed = target;
        if (disposed) return;
        if (!covered) {
          covered = true; setPhase('clearing'); callbacks.current.onCovered();
          schedule();
        } else {
          finished = true; setPhase('complete'); callbacks.current.onComplete();
        }
      }, Math.max(0, target - elapsed));
    };
    const sync = () => { stop(); schedule(); };
    const visibility = () => { setHidden(document.hidden); sync(); };
    syncTimer.current = sync;
    document.addEventListener('visibilitychange', visibility);
    setHidden(document.hidden); schedule();
    return () => {
      disposed = true; stop();
      document.removeEventListener('visibilitychange', visibility);
      syncTimer.current = () => {};
    };
  }, [running, duration]);

  useEffect(() => { syncTimer.current(); }, [paused]);

  if (!running || phase === 'complete') return null;
  return <div
    className="intro-web-wipe"
    data-intro-web-wipe
    data-phase={phase}
    data-paused={paused || hidden}
    aria-hidden="true"
    style={{ '--intro-web-half': `${duration / 2}ms` } as CSSProperties}
  >
    <div className="intro-web-wipe-cover" />
    <div className="intro-web-wipe-silk intro-web-wipe-silk-left" />
    <div className="intro-web-wipe-silk intro-web-wipe-silk-right" />
    <svg className="intro-web-wipe-strands" viewBox="0 0 1000 1000" preserveAspectRatio="none" fill="none">
      <path d="M520 460 0 0M520 460 500 0M520 460 1000 0M520 460 1000 500M520 460 1000 1000M520 460 510 1000M520 460 0 1000M520 460 0 500" />
      <path d="M245 220Q360 245 510 217Q637 247 749 225Q739 355 755 478Q731 607 748 722Q625 704 515 741Q380 704 244 746Q273 602 250 481Q276 353 245 220Z" />
      <path d="M115 105Q300 155 505 100Q700 151 875 115Q846 290 885 488Q842 697 876 872Q678 839 512 884Q312 840 114 890Q154 685 120 490Q151 285 115 105Z" />
      <path d="M370 326Q442 350 516 326Q588 351 650 331Q632 395 652 470Q632 539 650 603Q580 588 517 620Q441 591 371 612Q391 537 373 473Q391 395 370 326Z" />
    </svg>
  </div>;
}
