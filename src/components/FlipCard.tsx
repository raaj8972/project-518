import React from 'react';

export type FlipCardProps = {
  front: React.ReactNode;
  back: React.ReactNode;
  className?: string;
  /**
   * On touch devices, hover doesn't exist. If true, clicking toggles flip via JS.
   * Default: true
   */
  enableTapToggle?: boolean;
  /**
   * On desktop/hover-capable devices, allow click to toggle the flip.
   * Default: false
   */
  enableClickToggleOnDesktop?: boolean;
  /**
   * If true, wrapper tap will NOT toggle; flip must be driven by the exposed ref methods.
   */
  disableWrapperTap?: boolean;
  /**
   * Start flipped?
   */
  initialFlipped?: boolean;
};

export type FlipCardHandle = {
  toggle: () => void;
  flip: (set: boolean) => void;
};

export const FlipCard = ({ front, back, className = '', enableTapToggle = true, enableClickToggleOnDesktop = false, disableWrapperTap = false, initialFlipped = false, ref }: FlipCardProps & { ref?: React.Ref<FlipCardHandle> }) => {
  const [flipped, setFlipped] = React.useState(initialFlipped);

  // Detect touch-capable devices (prefer pointer/hover queries, with fallbacks)
  const [isTouchDevice, setIsTouchDevice] = React.useState(false);
  React.useEffect(() => {
    try {
      const mq = typeof window !== 'undefined' ? window.matchMedia('(hover: none), (pointer: coarse)') : null;
      const detected = !!(
        (mq && mq.matches) ||
        (typeof window !== 'undefined' && 'ontouchstart' in window)
      );
      setIsTouchDevice(detected);
    } catch {
      setIsTouchDevice(false);
    }
  }, []);

  const touchStartY = React.useRef<number | null>(null);

  const handleToggle = () => {
    // If disabling wrapper taps, only block on touch devices to preserve desktop click behavior
    if (disableWrapperTap && isTouchDevice) return;
    if (isTouchDevice) {
      if (enableTapToggle) setFlipped(f => !f);
    } else {
      if (enableClickToggleOnDesktop) setFlipped(f => !f);
    }
  };

  const onTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    // Don't consider touches that start on interactive elements
    const target = e.target as HTMLElement;
    if (target && (target.closest('button') || target.closest('a'))) return;
    touchStartY.current = e.touches[0]?.clientY ?? null;
  };

  const onTouchEnd: React.TouchEventHandler<HTMLDivElement> = (e) => {
    // Ignore if started on interactive elements
    const target = e.target as HTMLElement;
    if (target && (target.closest('button') || target.closest('a'))) return;
    if (touchStartY.current == null) return;
    const endY = e.changedTouches[0]?.clientY ?? touchStartY.current;
    const dy = Math.abs(endY - touchStartY.current);
    touchStartY.current = null;
    // Only treat as a tap if minimal vertical movement (prevents flip during scroll)
    if (dy < 10) {
      // Prevent the subsequent synthetic click from firing and causing a double-toggle
      e.preventDefault();
      handleToggle();
    }
  };

  React.useImperativeHandle(ref, () => ({
    toggle: () => setFlipped(f => !f),
    flip: (set: boolean) => setFlipped(set),
  }), []);

  const onClickDesktop: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (isTouchDevice) return; // touch uses touch handlers
    const target = e.target as HTMLElement;
    if (target && (target.closest('button') || target.closest('a'))) {
      return; // ignore clicks on interactive elements
    }
    handleToggle();
  };

  return (
    <div
      className={`flip-3d ${className}`}
      role="button"
      aria-pressed={flipped}
      // Hint that this region is interactive on mobile
      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' as any }}
      // On touch devices, avoid onClick to prevent double-toggle (touchend + synthetic click)
      onClick={isTouchDevice ? undefined : onClickDesktop}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className={`flip-3d-inner ${flipped ? 'is-flipped' : ''}`}>
        <div className="flip-3d-front">{front}</div>
        <div className="flip-3d-back">{back}</div>
      </div>
    </div>
  );
};

export default FlipCard;