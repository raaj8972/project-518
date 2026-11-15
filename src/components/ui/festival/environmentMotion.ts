/** Normalized, bounded particle physics shared by mouse and touch interaction. */
export interface WorldPointer { x: number; y: number; active: boolean; strength: number }
export interface ParticleField { positions: Float32Array; velocities: Float32Array; phases: Float32Array; cursor: number }
export function seededRandom(seed = 518) {
  let state = seed >>> 0;
  return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
}
export function createParticleField(count: number, seed = 518): ParticleField {
  const random = seededRandom(seed);
  const positions = new Float32Array(count * 2);
  const velocities = new Float32Array(count * 2);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) { positions[i * 2] = random(); positions[i * 2 + 1] = random(); phases[i] = random() * Math.PI * 2; }
  return { positions, velocities, phases, cursor: 0 };
}
export function burstParticles(field: ParticleField, x: number, y: number, count = 28) {
  const total = field.phases.length;
  for (let j = 0; j < Math.min(count, total); j++) {
    const i = field.cursor++ % total;
    const angle = j * 2.399963 + field.phases[i];
    const speed = .065 + (j % 7) * .012;
    field.positions[i * 2] = x + Math.cos(angle) * .006;
    field.positions[i * 2 + 1] = y + Math.sin(angle) * .006;
    field.velocities[i * 2] = Math.cos(angle) * speed;
    field.velocities[i * 2 + 1] = Math.sin(angle) * speed;
  }
}
export function stepParticles(field: ParticleField, delta: number, time: number, pointer: WorldPointer, aspect = 1) {
  const dt = Math.max(0, Math.min(delta, .06));
  const damping = Math.exp(-dt * 2.3);
  for (let i = 0; i < field.phases.length; i++) {
    const k = i * 2;
    let x = field.positions[k]; let y = field.positions[k + 1];
    let vx = field.velocities[k] * damping; let vy = field.velocities[k + 1] * damping;
    if (pointer.active) {
      const dx = (x - pointer.x) * aspect;
      const dy = y - pointer.y;
      const distance = Math.hypot(dx, dy);
      if (distance < .18) {
        const angle = distance > .0001 ? Math.atan2(dy, dx) : field.phases[i];
        const force = (1 - distance / .18) * dt * .9 * pointer.strength;
        vx += Math.cos(angle) * force / Math.max(.4, aspect);
        vy += Math.sin(angle) * force;
      }
    }
    x += (vx + Math.sin(time * .25 + field.phases[i]) * .0035 + .003) * dt;
    y += (vy - .004 - (i % 3) * .001) * dt;
    field.positions[k] = x < -.05 ? 1.05 : x > 1.05 ? -.05 : x;
    field.positions[k + 1] = y < -.05 ? 1.05 : y > 1.05 ? -.05 : y;
    field.velocities[k] = vx; field.velocities[k + 1] = vy;
  }
}
