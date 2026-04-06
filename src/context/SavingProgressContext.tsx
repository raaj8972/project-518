import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type SavingProgressContextType = {
  isActive: boolean;
  percent: number; // 0..100
  label?: string;
  start: (label?: string, initialPercent?: number) => void;
  set: (percent: number) => void;
  inc: (delta: number) => void;
  done: () => void;
  withSteps: (totalSteps: number, label?: string) => {
    next: (stepLabel?: string) => void;
    done: () => void;
  };
};

const SavingProgressContext = createContext<SavingProgressContextType | null>(null);

// [DEDUPE] Use window bridge for singleton Context
const PrimarySavingProgressContext = ((typeof window !== 'undefined') 
  ? ((window as any).__SAVING_PROGRESS_CONTEXT__ || ((window as any).__SAVING_PROGRESS_CONTEXT__ = SavingProgressContext))
  : SavingProgressContext) as React.Context<SavingProgressContextType | null>;


export function SavingProgressProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [percent, setPercent] = useState(0);
  const [label, setLabel] = useState<string | undefined>(undefined);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback((lbl?: string, initialPercent: number = 5) => {
    clearTimer();
    setLabel(lbl);
    setPercent(Math.max(0, Math.min(100, initialPercent)));
    setIsActive(true);
    // Gentle auto-advance while waiting so it feels alive (caps at 95%)
    timerRef.current = window.setInterval(() => {
      setPercent((p) => (p < 95 ? Math.min(95, p + Math.random() * 2.5 + 0.5) : p));
    }, 500) as unknown as number;
  }, [clearTimer]);

  const set = useCallback((p: number) => {
    setPercent(Math.max(0, Math.min(100, p)));
  }, []);

  const inc = useCallback((delta: number) => {
    setPercent((p) => Math.max(0, Math.min(100, p + delta)));
  }, []);

  const done = useCallback(() => {
    clearTimer();
    setPercent(100);
    // brief hold for 400ms then hide
    window.setTimeout(() => {
      setIsActive(false);
      setLabel(undefined);
      setPercent(0);
    }, 400);
  }, [clearTimer]);

  const withSteps = useCallback((totalSteps: number, lbl?: string) => {
    const stepSize = totalSteps > 0 ? Math.max(1, Math.floor(95 / totalSteps)) : 95;
    start(lbl);
    let current = 0;
    const next = (stepLabel?: string) => {
      current += 1;
      if (stepLabel) setLabel(stepLabel);
      setPercent((p) => Math.min(95, Math.max(p, current * stepSize)));
    };
    return { next, done };
  }, [start, done]);

  const value = useMemo(() => ({ isActive, percent, label, start, set, inc, done, withSteps }), [isActive, percent, label, start, set, inc, done, withSteps]);

  return (
    <PrimarySavingProgressContext.Provider value={value}>
      {children}
      <SavingProgressOverlay active={isActive} percent={percent} label={label} />
    </PrimarySavingProgressContext.Provider>
  );
}

export const useSavingProgress = () => {
  const ctx = useContext(PrimarySavingProgressContext);
  if (!ctx) throw new Error('useSavingProgress must be used within SavingProgressProvider');
  return ctx;
};

// Inline overlay to avoid another file; renders fixed top bar with percent
const SavingProgressOverlay: React.FC<{ active: boolean; percent: number; label?: string }> = ({ active, percent, label }) => {
  if (!active) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[10000]">
      <div className="relative">
        <div className="h-1.5 w-full bg-black/30 backdrop-blur-sm" />
        <div
          className="absolute top-0 left-0 h-1.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 shadow-[0_0_10px_rgba(99,102,241,0.6)] transition-[width] duration-200"
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
      <div className="pointer-events-none flex justify-center">
        <div className="mt-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-black/60 text-white shadow ring-1 ring-white/10">
          {label ? <span className="opacity-90 mr-1">{label}</span> : null}
          <span>{Math.round(percent)}%</span>
        </div>
      </div>
    </div>
  );
};
