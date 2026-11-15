export interface LightTarget {
  id: number;
  x: number;
  y: number;
  width: number;
}

/** Hold the same sponsor as it passes, then acquire the next visible sponsor. */
export function selectLightTarget<T extends LightTarget>(targets: T[], originX: number, viewportWidth: number, lightCount: number, previousId: number | null, claimed: Set<number>): T | undefined {
  const reach = viewportWidth / lightCount * .67;
  const visible = targets.filter(target => target.x + target.width / 2 > 0 && target.x - target.width / 2 < viewportWidth && !claimed.has(target.id));
  const readable = visible.filter(target => {
    const visibleWidth = Math.min(viewportWidth, target.x + target.width / 2) - Math.max(0, target.x - target.width / 2);
    return visibleWidth / target.width >= (lightCount === 1 ? .62 : .45);
  });
  const candidates = readable.length ? readable : visible;
  const previous = candidates.find(target => target.id === previousId);
  if (previous && Math.abs(previous.x - originX) < reach) return previous;
  return candidates.reduce<T | undefined>((nearest, target) => !nearest || Math.abs(target.x - originX) < Math.abs(nearest.x - originX) ? target : nearest, undefined);
}

export function lightAngle(originX: number, originY: number, targetX: number, targetY: number): number {
  return Math.max(-52, Math.min(52, Math.atan2(originX - targetX, Math.max(1, targetY - originY)) * 180 / Math.PI));
}

/** Measure on resize only. The rail's existing animation supplies its offset. */
export function createPartnerLighting(container: HTMLElement, track: HTMLElement) {
  let targets: Array<LightTarget & { element: HTMLElement }> = [];
  let lamps: Array<{ element: HTMLElement; head: HTMLElement; x: number; y: number; angle: number; targetId: number | null }> = [];
  let width = 0;
  let lit = new Set<HTMLElement>();

  const measure = () => {
    const stage = container.getBoundingClientRect();
    const rail = track.getBoundingClientRect();
    width = stage.width;
    targets = Array.from(track.querySelectorAll<HTMLElement>('.logoloop__card')).map((element, id) => {
      const rect = element.getBoundingClientRect();
      return { id, element, x: rect.left - rail.left + rect.width / 2, y: rect.top - stage.top + rect.height * .43, width: rect.width };
    });
    lamps = Array.from(container.querySelectorAll<HTMLElement>('[data-partner-light]')).filter(element => getComputedStyle(element).display !== 'none').map(element => {
      const rect = element.getBoundingClientRect();
      return { element, head: element.querySelector<HTMLElement>('.partner-spotlight__head')!, x: rect.left - stage.left + rect.width / 2, y: rect.top - stage.top + rect.height * .22, angle: Number(element.dataset.angle) || 0, targetId: null };
    });
    container.style.setProperty('--partner-beam-length', `${Math.max(220, stage.height - 60)}px`);
  };

  const update = (offset: number, deltaTime: number) => {
    const movingTargets = targets.map(target => ({ ...target, x: target.x - offset }));
    const claimed = new Set<number>();
    const nextLit = new Set<HTMLElement>();
    for (const lamp of lamps) {
      const target = selectLightTarget(movingTargets, lamp.x, width, lamps.length, lamp.targetId, claimed);
      if (!target) continue;
      claimed.add(target.id);
      lamp.targetId = target.id;
      const aim = lightAngle(lamp.x, lamp.y, target.x, target.y);
      // A weighted head catches a new sponsor smoothly, with no free-running sway.
      lamp.angle += (aim - lamp.angle) * (deltaTime === 0 ? 1 : 1 - Math.exp(-deltaTime / .22));
      lamp.head.style.transform = `rotate(${lamp.angle.toFixed(3)}deg)`;
      lamp.element.dataset.angle = String(lamp.angle);
      const hit = lamp.x - Math.tan(lamp.angle * Math.PI / 180) * (target.y - lamp.y);
      const hitPercent = (hit - target.x + target.width / 2) / target.width * 100;
      const intensity = Math.max(0, 1 - Math.abs(hit - target.x) / (target.width * .7));
      target.element.style.setProperty('--partner-hit-x', `${hitPercent.toFixed(1)}%`);
      target.element.style.setProperty('--partner-lit', intensity.toFixed(2));
      nextLit.add(target.element);
    }
    for (const element of lit) if (!nextLit.has(element)) element.style.setProperty('--partner-lit', '0');
    lit = nextLit;
  };

  measure();
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
  observer?.observe(container);
  observer?.observe(track);
  window.addEventListener('resize', measure, { passive: true });
  return { update, dispose() {
    observer?.disconnect();
    window.removeEventListener('resize', measure);
    for (const element of lit) element.style.removeProperty('--partner-lit');
  } };
}
