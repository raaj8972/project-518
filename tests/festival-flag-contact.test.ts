import { describe, expect, it } from 'vitest';
import type { Mesh } from 'three';
import { createFlagClothMotion, createFlagInteraction } from '../src/components/ui/festival/flagMotion';
import { createBattleFlag } from '../src/components/ui/festival/environmentModel';

describe('flag cloth contact', () => {
  it('deforms the touched fabric while keeping the suspension row and pole fixed', () => {
    const flag = createBattleFlag(), idle = createBattleFlag();
    const contact = createFlagInteraction();
    contact.pointer = { active: true, x: .15, y: -1.6, strength: 2 };
    const cloth = flag.root.getObjectByName('wind-deformed-cloth') as Mesh;
    const regular = (idle.root.getObjectByName('wind-deformed-cloth') as Mesh).geometry.attributes.position;
    const positions = cloth.geometry.attributes.position;
    const rest = Float32Array.from(positions.array);
    flag.root.updateMatrixWorld(true);
    const pole = flag.root.children[1]; const poleTransform = pole.matrix.clone();
    try {
      for (let frame = 0; frame < 20; frame++) {
        flag.update(frame / 30, 0, 0, 1 / 30, contact); idle.update(frame / 30);
      }
      let displacement = 0;
      for (let i = 0; i < positions.count; i++) {
        if (Math.abs(rest[i * 3 + 1]) < .0001) {
          expect(positions.getX(i)).toBe(rest[i * 3]); expect(positions.getY(i)).toBeCloseTo(0, 6); expect(positions.getZ(i)).toBeCloseTo(0, 6);
        }
        displacement = Math.max(displacement, Math.abs(positions.getX(i) - regular.getX(i)));
      }
      expect(displacement).toBeGreaterThan(.2);
      flag.root.updateMatrixWorld(true); expect(pole.matrix.equals(poleTransform)).toBe(true);
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
    } finally { flag.dispose(); idle.dispose(); }
  });

  it('keeps momentum after release then settles back into the wind', () => {
    const rest = new Float32Array([.1, -1.6, 0]);
    const motion = createFlagClothMotion(rest), contact = createFlagInteraction();
    contact.pointer = { active: true, x: 0, y: -1.6, strength: 2 };
    for (let frame = 0; frame < 20; frame++) motion.step(1 / 30, contact);
    const pressed = Math.abs(motion.offset[0]); expect(pressed).toBeGreaterThan(.3);
    contact.pointer.active = false; motion.step(1 / 30, contact);
    expect(Math.abs(motion.offset[0])).toBeGreaterThan(pressed * .7);
    for (let frame = 0; frame < 90; frame++) motion.step(1 / 30, contact);
    expect(Math.abs(motion.offset[0])).toBeLessThan(.001);
    expect(Math.abs(motion.offset[1])).toBeLessThan(.001);
  });

  it('folds away from an overlapping island on either side and relaxes after it passes', () => {
    const left = createFlagClothMotion(new Float32Array([.2, -1.3, 0]));
    const right = createFlagClothMotion(new Float32Array([-.2, -1.3, 0]));
    const contact = createFlagInteraction();
    contact.island = { x: 1, y: -1.3, radiusX: 1.3, radiusY: 1, side: -1 };
    for (let frame = 0; frame < 20; frame++) left.step(.04, contact);
    contact.island.x = -1; contact.island.side = 1;
    for (let frame = 0; frame < 20; frame++) right.step(.04, contact);
    expect(left.offset[0]).toBeLessThan(-.2); expect(right.offset[0]).toBeGreaterThan(.2);
    expect(left.offset[1]).toBeLessThan(0); expect(right.offset[1]).toBeLessThan(0);
    contact.island.x = -10;
    for (let frame = 0; frame < 80; frame++) right.step(.04, contact);
    expect(Math.abs(right.offset[0])).toBeLessThan(.001);
  });

  it('does not advance while paused and bounds long-frame contact impulses', () => {
    const motion = createFlagClothMotion(new Float32Array([0, -2, 0, 0, 0, 0]));
    const contact = createFlagInteraction(); contact.pointer = { active: true, x: 0, y: -2, strength: 2 };
    motion.step(0, contact); expect(Array.from(motion.offset)).toEqual([0, 0, 0, 0]);
    for (let i = 0; i < 200; i++) motion.step(i % 7 === 0 ? 1000 : .04, contact);
    expect(Array.from(motion.offset).every(Number.isFinite)).toBe(true);
    expect(Math.max(...motion.offset.map(Math.abs))).toBeLessThan(1);
    expect(motion.offset[2]).toBe(0); expect(motion.offset[3]).toBe(0);
  });
});
