// Defensive runtime shims for environments that misbehave during feature-detection
// Keep this file minimal and safe; it is imported as the very first module in
// the app entry so it runs before any libraries that may synchronously call
// Navigator.locks or check for GestureEvent.

// Wrap navigator.locks.request to avoid throwing NavigatorLockAcquireTimeoutError
// during quick-acquire/ifAvailable checks in some browsers/dev envs.
if (typeof navigator !== 'undefined' && (navigator as any).locks && typeof (navigator as any).locks.request === 'function') {
  const origRequest = (navigator as any).locks.request.bind((navigator as any).locks);
  (navigator as any).locks.request = async (name: string, options: any, callback: any) => {
    // Wrap the caller's callback so if it throws an acquire-timeout error
    // (Supabase's navigatorLock throws this when lock === null and acquireTimeout === 0),
    // we retry the callback with a dummy lock object instead of letting
    // the error bubble during module initialization.
    const wrappedCallback = async (lock: any) => {
      try {
        return await callback(lock);
      } catch (e: any) {
        const isAcquireTimeout = !!(
          e && (e.isAcquireTimeout === true || e.name === 'NavigatorLockAcquireTimeoutError' || (typeof e.message === 'string' && e.message.includes('Acquiring an exclusive Navigator LockManager lock')))
        );

        if (isAcquireTimeout) {
          // Provide a minimal dummy lock object that has a name and a no-op release.
          const dummyLock = { name, async release() { /* no-op */ } } as any;
          try {
            return await callback(dummyLock);
          } catch (e2) {
            // If the caller still fails when given a dummy, rethrow the original error
            // so the failure is visible to the developer.
            throw e;
          }
        }

        throw e;
      }
    };

    try {
      return await origRequest(name, options, wrappedCallback);
    } catch (err) {
      // Some engines may throw synchronously from request; emulate tolerant behavior
      // and invoke the callback with null (or dummy for ifAvailable) so callers
      // that run during startup don't crash.
      try {
        const isIfAvailable = options && typeof options === 'object' && options.ifAvailable === true;
        if (isIfAvailable) {
          const dummyLock = { name, async release() { /* no-op */ } } as any;
          return await callback(dummyLock);
        }

        return await callback(null);
      } catch (e) {
        throw err;
      }
    }
  };
}

// Minimal GestureEvent shim to avoid ReferenceError during runtime checks.
// Only provides the global constructor so libraries that probe for it don't crash.
if (typeof (globalThis as any).GestureEvent === 'undefined') {
  try {
    (globalThis as any).GestureEvent = function GestureEvent(type: string, init?: any) {
      return new Event(type, init as EventInit);
    } as any;
  } catch (e) {
    (globalThis as any).GestureEvent = (globalThis as any).Event;
  }
}

// Touch capability detection used for CSS classes and small runtime helpers.
(() => {
  try {
    const isTouch = (('ontouchstart' in globalThis) || (navigator as any).maxTouchPoints > 0 || (navigator as any).msMaxTouchPoints > 0);
    if (isTouch && typeof document !== 'undefined') {
      document.documentElement.classList.add('touch-enabled');

      // Persistent tap glow handler (used by some sponsor UI). Keep passive listener.
      let lastTapEl: HTMLElement | null = null;
      window.addEventListener('touchstart', (e) => {
        const target = (e.target as HTMLElement).closest('.home-sponsor-glow, .sponsor-interactive') as HTMLElement | null;
        if (!target) return;
        if (lastTapEl && lastTapEl !== target) {
          lastTapEl.classList.remove('tap-glow');
        }
        target.classList.add('tap-glow');
        lastTapEl = target;
        const persistFor = 850; // ms
        setTimeout(() => {
          if (target === lastTapEl) {
            target.classList.remove('tap-glow');
            if (lastTapEl === target) lastTapEl = null;
          }
        }, persistFor);
      }, { passive: true });
    }
  } catch (err) {
    // swallow errors here — shims must never throw during startup
  }
})();
