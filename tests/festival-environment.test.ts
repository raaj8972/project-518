import { describe, expect, it } from 'vitest';
import { InstancedMesh, Mesh, MeshStandardMaterial, PointLight, Raycaster, Vector3 } from 'three';
import { createBattleFlag, createFloatingIsland } from '../src/components/ui/festival/environmentModel';
import { burstParticles, createParticleField, stepParticles } from '../src/components/ui/festival/environmentMotion';

describe('interactive festival world', () => {
  it('keeps the island at a fixed height without vertical bobbing or rocking', () => {
    const island = createFloatingIsland();
    try {
      for (let time = 0; time <= 60; time += .5) {
        island.update(time);
        expect(island.root.position.y).toBe(0);
        expect(island.root.rotation.z).toBe(0);
      }
    } finally { island.dispose(); }
  });
  it('exposes an emissive core through a real opening in the surface, with its light inside the island', () => {
    const island = createFloatingIsland(); island.root.updateMatrixWorld(true);
    const surface = island.root.getObjectByName('broken-stone-island-surface') as Mesh;
    const ray = new Raycaster(new Vector3(0, 2, 0), new Vector3(0, -1, 0));
    expect(ray.intersectObject(surface)).toHaveLength(0);
    ray.ray.origin.x = .6;
    expect(ray.intersectObject(surface).length).toBeGreaterThan(0);
    const core = island.root.getObjectByName('island-internal-energy-core') as Mesh;
    const light = island.root.getObjectByName('island-internal-green-light') as PointLight;
    expect(core.position.y + .105).toBeLessThan(.15);
    expect(light.position.y).toBeLessThan(.15);
    expect(light.position.z).toBe(0);
    island.update(0); const initial = (core.material as MeshStandardMaterial).emissiveIntensity;
    island.update(1); expect((core.material as MeshStandardMaterial).emissiveIntensity).not.toBe(initial);
    expect(core.parent).toBe(island.root.getObjectByName('island-terrain'));
    island.dispose();
  });
  it('keeps the college facade visible during idle motion and permits a full turn when dragged', () => {
    const island = createFloatingIsland();
    const terrain = island.root.getObjectByName('island-terrain')!;
    expect(island.root.getObjectByName('island-orbit-0')).toBeUndefined();
    expect(island.root.getObjectByName('island-orbit-1')).toBeUndefined();
    island.update(1); const rotation = terrain.userData.rotation;
    island.update(3); expect(terrain.userData.rotation).toBeGreaterThan(rotation);
    const beforeDrag = terrain.userData.rotation; island.update(3, 0, Math.PI);
    expect(terrain.userData.rotation - beforeDrag).toBeCloseTo(Math.PI);
    for (let time = 0; time <= 180; time += 3) {
      island.update(time);
      expect(Math.abs(terrain.rotation.y)).toBeLessThan(Math.PI / 4);
    }
    expect(terrain.getObjectByName('textured-geological-cliff')).toBeDefined();
    expect(terrain.getObjectByName('iq-city-college-campus')).toBeDefined();
    expect(terrain.getObjectByName('college-left-pink-wing')).toBeDefined();
    expect(terrain.getObjectByName('college-white-right-wing')).toBeDefined();
    expect(terrain.getObjectByName('college-circular-landscaped-courtyard')).toBeDefined();
    expect(terrain.getObjectByName('ruined-gothic-cathedral')).toBeUndefined();
    expect(terrain.rotation.y).toBeCloseTo(terrain.userData.rotation);
    island.dispose();
  });
  it('pins the flags to the pole while the lower cloth and its mapped logo deform with the wind', () => {
    const flag = createBattleFlag('/logo.png');
    const cloth = flag.root.getObjectByName('wind-deformed-cloth') as Mesh;
    const positions = cloth.geometry.attributes.position;
    const top = Array.from({ length: positions.count }, (_, i) => i).filter(i => Math.abs(positions.getY(i)) < .0001);
    expect(top.length).toBeGreaterThan(10);
    const rest = Float32Array.from(positions.array);
    flag.update(2.5, 1);
    top.forEach(i => { expect(positions.getX(i)).toBeCloseTo(rest[i * 3]); expect(positions.getY(i)).toBeCloseTo(0); expect(positions.getZ(i)).toBeCloseTo(0); });
    expect(Array.from(positions.array).some((value, i) => Math.abs(value - rest[i]) > .04)).toBe(true);
    expect(flag.root.children.length).toBe(7); // Cloth, pole, five suspension loops.
    flag.dispose();
  });
  it('releases each shared island geometry/material once even when disposal is called twice', () => {
    const island = createFloatingIsland(); const resources = new Set<any>();
    island.root.traverse(object => { if ('geometry' in object) resources.add(object.geometry); if ('material' in object) resources.add(object.material); });
    const counts = new Map<any, number>(); resources.forEach(resource => resource.addEventListener('dispose', () => counts.set(resource, (counts.get(resource) || 0) + 1)));
    island.dispose(); island.dispose(); expect(counts.size).toBe(resources.size); expect([...counts.values()].every(count => count === 1)).toBe(true);
  });
  it('keeps the detailed campus inside a bounded rendering budget', () => {
    const island = createFloatingIsland();
    let draws = 0; let triangles = 0;
    island.root.traverseVisible(object => {
      if (!(object instanceof Mesh)) return;
      draws++;
      triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3 * (object instanceof InstancedMesh ? object.count : 1);
    });
    expect(draws).toBeLessThanOrEqual(30);
    expect(triangles).toBeLessThan(50000);
    island.dispose();
  });
});

describe('touch and mouse particle physics', () => {
  it('pushes nearby particles away from the pointer and emits a radial touch burst', () => {
    const active = createParticleField(40); const idle = createParticleField(40);
    active.positions[0] = idle.positions[0] = .53; active.positions[1] = idle.positions[1] = .5;
    stepParticles(active, .04, 1, { x: .5, y: .5, active: true, strength: 2 });
    stepParticles(idle, .04, 1, { x: .5, y: .5, active: false, strength: 2 });
    expect(active.positions[0]).toBeGreaterThan(idle.positions[0]);
    burstParticles(active, .3, .6, 28);
    for (let i = 0; i < 28; i++) {
      expect(Math.hypot(active.positions[i * 2] - .3, active.positions[i * 2 + 1] - .6)).toBeLessThan(.01);
      expect(Math.hypot(active.velocities[i * 2], active.velocities[i * 2 + 1])).toBeGreaterThan(.06);
    }
  });
  it('stays finite and bounded across repeated touch bursts, long tab suspensions and mobile aspect ratios', () => {
    const field = createParticleField(180);
    for (let i = 0; i < 600; i++) {
      if (i % 15 === 0) burstParticles(field, .5, .8, 38);
      stepParticles(field, i % 30 === 0 ? 1000 : .04, i / 25, { x: .5, y: .8, active: true, strength: 2 }, .45);
      expect([...field.positions, ...field.velocities].every(Number.isFinite)).toBe(true);
      expect(Math.min(...field.positions)).toBeGreaterThanOrEqual(-.1); expect(Math.max(...field.positions)).toBeLessThanOrEqual(1.1);
    }
  });
});
