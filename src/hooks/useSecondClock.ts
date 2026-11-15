import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

let timestamp = Date.now();
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();
const snapshot = () => timestamp;
const noopSubscribe = () => () => {};
function subscribe(listener: () => void) {
  timestamp = Date.now();
  listeners.add(listener);
  if (!timer) timer = setInterval(() => {
    if (typeof document !== 'undefined' && document.hidden) return;
    timestamp = Date.now();
    listeners.forEach(notify => notify());
  }, 1000);
  return () => {
    listeners.delete(listener);
    if (!listeners.size && timer) { clearInterval(timer); timer = undefined; }
  };
}
export function useSecondClock(enabled = true) {
  const initial = useRef(Date.now());
  const initialSnapshot = useCallback(() => initial.current, []);
  return useSyncExternalStore(enabled ? subscribe : noopSubscribe, enabled ? snapshot : initialSnapshot, initialSnapshot);
}
export function useDeadlineClock(start: number, lead: number, suppliedNow?: number) {
  const [active, setActive] = useState(() => Date.now() >= start - lead);
  useEffect(() => {
    if (suppliedNow !== undefined || !Number.isFinite(start)) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      const remaining = start - lead - Date.now();
      setActive(remaining <= 0);
      if (remaining > 0) timer = setTimeout(schedule, Math.min(remaining, 2_147_483_647));
    };
    schedule();
    return () => { if (timer) clearTimeout(timer); };

  }, [start, lead, suppliedNow]);
  const live = Date.now() >= start;
  const time = useSecondClock(suppliedNow === undefined && active && !live);
  return suppliedNow ?? (live ? Date.now() : time);
}
