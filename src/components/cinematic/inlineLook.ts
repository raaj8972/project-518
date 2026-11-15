export type CharacterLook = { yaw: number };
export const canLookAround = (progress: number) => progress >= .65 && progress < .88;

/** Horizontal drag owns look-around; vertical gestures remain native page scrolling. */
export function createInlineLook(element: HTMLElement, options: {
  progress: { current: number }; look: CharacterLook; invalidate: () => void;
}) {
  let gesture: { id: number; x: number; y: number; lastX: number; axis?: 'horizontal' | 'vertical' } | undefined;
  const release = () => {
    if (gesture && element.hasPointerCapture?.(gesture.id)) element.releasePointerCapture?.(gesture.id);
    gesture = undefined; delete element.dataset.looking;
  };
  const rotate = (radians: number) => {
    options.look.yaw = Math.max(-Math.PI, Math.min(Math.PI, options.look.yaw + radians));
    options.invalidate();
  };
  const down = (event: PointerEvent) => {
    if (!canLookAround(options.progress.current) || event.button !== 0 || event.isPrimary === false) return;
    if ((event.target as Element | null)?.closest('a,button,input,select,textarea')) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX };
  };
  const move = (event: PointerEvent) => {
    if (!gesture || event.pointerId !== gesture.id) return;
    if (!canLookAround(options.progress.current)) { release(); return; }
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (!gesture.axis) {
      if (Math.hypot(dx, dy) < 8) return;
      if (Math.abs(dx) > Math.abs(dy) * 1.25) {
        gesture.axis = 'horizontal';
        element.setPointerCapture?.(event.pointerId); element.dataset.looking = 'true';
      } else if (Math.abs(dy) >= Math.abs(dx)) gesture.axis = 'vertical';
      else return;
    }
    if (gesture.axis !== 'horizontal') return;
    if (event.cancelable) event.preventDefault();
    rotate(-(event.clientX - gesture.lastX) / Math.max(320, window.innerWidth) * Math.PI * 2);
    gesture.lastX = event.clientX;
  };
  const up = (event: PointerEvent) => { if (gesture?.id === event.pointerId) release(); };
  const key = (event: KeyboardEvent) => {
    if (!canLookAround(options.progress.current) || (event.target as Element | null)?.closest('a,button,input')) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); rotate((event.key === 'ArrowLeft' ? 1 : -1) * Math.PI / 12);
    }
  };
  element.addEventListener('pointerdown', down);
  element.addEventListener('pointermove', move, { passive: false });
  element.addEventListener('pointerup', up); element.addEventListener('pointercancel', up);
  element.addEventListener('lostpointercapture', up); element.addEventListener('keydown', key);
  return () => {
    release(); element.removeEventListener('pointerdown', down); element.removeEventListener('pointermove', move);
    element.removeEventListener('pointerup', up); element.removeEventListener('pointercancel', up);
    element.removeEventListener('lostpointercapture', up); element.removeEventListener('keydown', key);
  };
}
