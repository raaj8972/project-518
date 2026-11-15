import { useEffect, useRef } from 'react';

const dialogs: symbol[] = [];
let originalOverflow = '';

/** Shared focus and scroll ownership for stacked event, rules and registration dialogs. */
export function useFestivalDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const id = Symbol('festival-dialog');
    const previousFocus = document.activeElement as HTMLElement | null;
    if (!dialogs.length) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    dialogs.push(id);
    const frame = requestAnimationFrame(() => ref.current?.focus());
    const handleKey = (event: KeyboardEvent) => {
      if (dialogs[dialogs.length - 1] !== id) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]') || [])
        .filter(element => !element.closest('[hidden], [aria-hidden="true"]') && element.getClientRects().length > 0);
      const first = items[0]; const last = items[items.length - 1];
      if (!first) { event.preventDefault(); ref.current?.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKey);
      const wasTop = dialogs[dialogs.length - 1] === id;
      const index = dialogs.indexOf(id);
      if (index >= 0) dialogs.splice(index, 1);
      if (!dialogs.length) document.body.style.overflow = originalOverflow;
      if (wasTop && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);
  return ref;
}
