import { useEffect } from 'react';

/**
 * useRevealCardInteractions
 * Delegated interactions for reveal cards on the HomeBound page:
 * - Toggle .revealed when tapping .reveal-trigger
 * - Close when tapping .reveal-close
 * - Play IG click animation on .ig-anim
 * Works for dynamically added content via event delegation.
 */
export function useRevealCardInteractions() {
  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      if (!target) return;

      // Close button
      const closeBtn = (target.closest?.('.reveal-close') as HTMLElement) || null;
      if (closeBtn) {
        ev.stopPropagation();
        closeBtn.closest('.reveal-card')?.classList.remove('revealed');
        return;
      }

      // Instagram click animation
      const ig = (target.closest?.('.ig-anim') as HTMLElement) || null;
      if (ig) {
        ig.classList.remove('ig-click');
        // Reflow to replay animation reliably
        void ig.offsetWidth;
        ig.classList.add('ig-click');
        window.setTimeout(() => ig.classList.remove('ig-click'), 600);
        // Don't return; allow link default behavior to proceed
      }

      // Allow links and buttons to behave normally
      if (target.closest?.('a, button')) return;

      // Toggle reveal on image/container tap
      const trigger = (target.closest?.('.reveal-trigger') as HTMLElement) || null;
      if (!trigger) return;
      const card = trigger.closest('.reveal-card');
      if (!card) return;
      card.classList.toggle('revealed');
    };

    document.addEventListener('click', onClick, { passive: true } as any);
    return () => document.removeEventListener('click', onClick as any);
  }, []);
}

export default useRevealCardInteractions;
