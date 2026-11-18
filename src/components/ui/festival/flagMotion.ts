export interface FlagInteraction {
  pointer: { active: boolean; x: number; y: number; strength: number };
  island: { x: number; y: number; radiusX: number; radiusY: number; side: number };
}

export function createFlagInteraction(): FlagInteraction {
  return { pointer: { active: false, x: 0, y: 0, strength: 0 }, island: { x: 0, y: 0, radiusX: 0, radiusY: 0, side: 1 } };
}

/** Small, damped cloth springs. The existing scene loop owns their clock. */
export function createFlagClothMotion(rest: Float32Array) {
  const offset = new Float32Array(rest.length / 3 * 2);
  const velocity = new Float32Array(offset.length);
  return {
    offset,
    step(delta: number, interaction?: FlagInteraction) {
      const dt = Math.max(0, Math.min(Number.isFinite(delta) ? delta : 0, .06));
      if (!dt) return;
      const steps = Math.ceil(dt / .01), h = dt / steps, damping = Math.exp(-9.5 * h);
      for (let i = 0; i < rest.length / 3; i++) {
        const x = rest[i * 3], y = rest[i * 3 + 1], free = Math.max(0, Math.min(1, -y / 2.2));
        const k = i * 2;
        if (!free) { offset[k] = offset[k + 1] = velocity[k] = velocity[k + 1] = 0; continue; }
        let targetX = 0, targetZ = 0;
        if (interaction) {
          const { pointer, island } = interaction;
          if (island.radiusX > 0 && island.radiusY > 0) {
            const dx = (x - island.x) / island.radiusX, dy = (y - island.y) / island.radiusY;
            // A rounded facade outline also catches the broad roof corners;
            // an ellipse would miss the fabric where those corners meet it.
            const outline = Math.sqrt(Math.sqrt(dx ** 4 + dy ** 4));
            const penetration = Math.max(0, 1.04 - outline);
            // The inner edge folds back as the campus sweeps past the cloth.
            const push = Math.min(.68, penetration * 3.2);
            targetX += island.side * push; targetZ -= push * .65;
          }
          if (pointer.active) {
            const dx = x - pointer.x, dy = y - pointer.y;
            const falloff = Math.max(0, 1 - Math.hypot(dx, dy) / .85) ** 2;
            const side = Math.abs(dx) > .04 ? Math.sign(dx) : island.side;
            targetX += side * falloff * pointer.strength * 1.15;
            targetZ -= falloff * pointer.strength * .9;
          }
        }
        targetX = Math.max(-.9, Math.min(.9, targetX)) * free;
        targetZ = Math.max(-.9, Math.min(.9, targetZ)) * free;
        for (let step = 0; step < steps; step++) {
          velocity[k] = (velocity[k] + (targetX - offset[k]) * 85 * h) * damping;
          velocity[k + 1] = (velocity[k + 1] + (targetZ - offset[k + 1]) * 85 * h) * damping;
          offset[k] += velocity[k] * h; offset[k + 1] += velocity[k + 1] * h;
        }
      }
    },
  };
}
