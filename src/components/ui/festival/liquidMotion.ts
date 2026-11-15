import { seededRandom } from './environmentMotion';

export interface LiquidDrop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  speed: number;
  phase: number;
  lane: number;
}

export interface LiquidBounds { width: number; top: number; bottom: number }
export interface LiquidPointer { x: number; y: number; active: boolean; pressed: boolean }

/** Document coordinates let the same droplets keep falling while the page scrolls. */
export function createLiquidDrops(bounds: LiquidBounds): LiquidDrop[] {
  const random = seededRandom(51826);
  const count = Math.min(160, Math.ceil((bounds.bottom - bounds.top) / 1000 * (bounds.width < 768 ? 18 : 26)));
  return Array.from({ length: Math.max(0, count) }, () => {
    const side = random();
    const lane = side < .36 ? .05 + random() * .17 : side < .72 ? .78 + random() * .17 : .24 + random() * .52;
    const speed = 145 + random() * 210;
    return { x: lane * bounds.width, y: bounds.top + random() * (bounds.bottom - bounds.top), vx: 0, vy: speed, radius: .8 + random() * 1.45, speed, phase: random() * Math.PI * 2, lane };
  });
}

export function stepLiquidDrops(drops: LiquidDrop[], delta: number, time: number, bounds: LiquidBounds, pointer: LiquidPointer): void {
  const dt = Math.max(0, Math.min(.05, delta));
  const radius = pointer.pressed ? 145 : 108;
  const damping = Math.exp(-dt * 2.8);
  for (const drop of drops) {
    // Water carries the touch impulse, then gradually rejoins the falling current.
    drop.vx *= damping;
    drop.vy += (drop.speed - drop.vy) * Math.min(1, dt * 1.8);
    if (pointer.active) {
      const dx = drop.x - pointer.x;
      const dy = drop.y - pointer.y;
      const distance = Math.hypot(dx, dy);
      if (distance < radius) {
        const angle = distance > .01 ? Math.atan2(dy, dx) : drop.phase;
        const force = (1 - distance / radius) * (pointer.pressed ? 2200 : 1350) * dt;
        drop.vx += Math.cos(angle) * force;
        drop.vy += Math.sin(angle) * force * .7;
      }
    }
    drop.x += (drop.vx + Math.sin(time * 1.1 + drop.phase) * 8) * dt;
    drop.y += drop.vy * dt;
    if (drop.y > bounds.bottom + 24 || drop.x < -40 || drop.x > bounds.width + 40) {
      drop.x = drop.lane * bounds.width;
      drop.y = bounds.top - drop.radius * 3;
      drop.vx = 0;
      drop.vy = drop.speed * .65;
    }
  }
}
