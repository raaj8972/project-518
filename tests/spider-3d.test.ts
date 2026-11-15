import { describe, expect, it } from 'vitest';
import { createSpiderModel } from '../src/components/ui/spider/spiderModel';
import { createSpiderEscape, spiderEscapePose, spiderPose, SPIDER_CYCLE_SECONDS } from '../src/components/ui/spider/spiderMotion';

describe('web descent and site-wide spider motion', () => {
  it('descends from above the viewport on silk, crawls across the page, then climbs back up', () => {
    const pose = (time: number) => spiderPose(time, 1440, 900, 500);
    expect(pose(0).y).toBeLessThan(0);
    expect(pose(4).y).toBeGreaterThan(pose(0).y);
    expect(pose(7.9).y).toBeGreaterThan(pose(4).y);
    expect(pose(4)).toMatchObject({ phase: 'descending', thread: 1 });
    expect(pose(9)).toMatchObject({ phase: 'hanging', thread: 1 });
    expect(pose(15)).toMatchObject({ phase: 'crawling', thread: 0 });
    expect(pose(20).x).not.toBeCloseTo(pose(12).x);
    expect(pose(49).y).toBeLessThan(pose(44).y);
    expect(pose(49)).toMatchObject({ phase: 'climbing', thread: 1 });
    expect(pose(2 + SPIDER_CYCLE_SECONDS)).toEqual(pose(2));
  });
  it('keeps the crawl path finite and inside desktop/mobile viewport centres', () => {
    for (const [width, height, size] of [[1440, 900, 500], [390, 844, 300], [844, 390, 280]]) {
      for (let time = 11; time < 43; time += .5) {
        const pose = spiderPose(time, width, height, size);
        expect(Number.isFinite(pose.heading)).toBe(true);
        expect(pose.x).toBeGreaterThanOrEqual(0);
        expect(pose.x).toBeLessThanOrEqual(width);
        expect(pose.y).toBeGreaterThanOrEqual(0);
        expect(pose.y).toBeLessThanOrEqual(height);
      }
    }
  });
});

describe('click/touch escape motion', () => {
  it('runs away immediately, detaches silk and rejoins a distant waypoint without a position jump', () => {
    for (const [width, height, size] of [[1440, 1000, 500], [390, 844, 304]]) {
      const from = spiderPose(9, width, height, size);
      const escape = createSpiderEscape(from, from.x, from.y, width, height, size);
      expect(escape.duration).toBeLessThan(1);
      const start = spiderEscapePose(escape, 0);
      expect(start.x).toBe(from.x); expect(start.y).toBe(from.y);
      expect(start).toMatchObject({ phase: 'fleeing', thread: 0, hanging: 0 });
      const reacted = spiderEscapePose(escape, .12);
      expect(Math.hypot(reacted.x - from.x, reacted.y - from.y)).toBeGreaterThan(25);
      const end = spiderEscapePose(escape, escape.duration);
      const resume = spiderPose(escape.resumeAt, width, height, size);
      expect(end.x).toBeCloseTo(resume.x); expect(end.y).toBeCloseTo(resume.y);
      expect(Math.hypot(end.x - from.x, end.y - from.y)).toBeGreaterThan(100);
    }
  });
  it('can be chased repeatedly on desktop and mobile without invalid or offscreen destinations', () => {
    for (const [width, height, size] of [[1440, 1000, 500], [390, 844, 304], [844, 390, 280]]) {
      let from = spiderPose(15, width, height, size);
      for (let chase = 0; chase < 20; chase++) {
        const escape = createSpiderEscape(from, from.x + 12, from.y - 20, width, height, size);
        for (let time = 0; time < escape.duration; time += .1) {
          const pose = spiderEscapePose(escape, time);
          expect([pose.x, pose.y, pose.heading].every(Number.isFinite)).toBe(true);
          expect(pose.x).toBeGreaterThanOrEqual(0); expect(pose.x).toBeLessThanOrEqual(width);
          expect(pose.y).toBeGreaterThanOrEqual(0); expect(pose.y).toBeLessThanOrEqual(height);
        }
        from = spiderEscapePose(escape, .25);
      }
    }
  });
});

describe('actual articulated Three.js model', () => {
  it('uses gold armor and a pulsing green reactor with visible light spill', () => {
    const model = createSpiderModel();
    const reactor = model.root.getObjectByName('reactor-emissive-ring') as any;
    const beam = model.root.getObjectByName('green-reactor-light-beam') as any;
    const armor = model.root.getObjectByName('gold-shell-plate-1') as any;
    expect(reactor.material.emissive.g).toBeGreaterThan(reactor.material.emissive.r);
    expect(reactor.material.emissiveIntensity).toBeGreaterThan(1);
    expect(armor.material.metalness).toBeGreaterThan(.8);
    expect(beam.material.transparent).toBe(true);
    expect(beam.material.depthWrite).toBe(false);
    model.update(0, 1);
    const before = reactor.material.emissiveIntensity;
    model.update(.4, 1);
    expect(reactor.material.emissiveIntensity).not.toBe(before);
    model.dispose();
  });
  it('has eight jointed legs and changes their 3D pose while staying under the geometry budget', () => {
    const model = createSpiderModel();
    expect(model.legs).toHaveLength(8);
    expect(model.legs.every(leg => leg.segments.length === 3)).toBe(true);
    model.update(0, 0);
    const old = model.legs[0].points[3].clone();
    model.update(.3, 0);
    expect(old.distanceTo(model.legs[0].points[3])).toBeGreaterThan(.05);
    let triangles = 0;
    model.root.traverse(object => {
      if ('isMesh' in object && object.isMesh && 'geometry' in object) {
        const geometry = (object as any).geometry;
        triangles += (geometry.index?.count || geometry.attributes.position.count) / 3;
      }
    });
    expect(triangles).toBeLessThan(50000);
    for (const leg of model.legs) for (const segment of leg.segments) {
      expect(segment.scale.y).toBeGreaterThan(0);
      expect(segment.position.toArray().every(Number.isFinite)).toBe(true);
    }
    model.dispose();
  });
  it('releases each shared geometry and material once', () => {
    const model = createSpiderModel();
    const resources = new Set<any>();
    model.root.traverse(object => {
      if ('geometry' in object) resources.add(object.geometry);
      if ('material' in object) resources.add(object.material);
    });
    const counts = new Map<any, number>();
    resources.forEach(resource => resource.addEventListener('dispose', () => counts.set(resource, (counts.get(resource) || 0) + 1)));
    model.dispose();
    expect(counts.size).toBe(resources.size);
    expect([...counts.values()].every(count => count === 1)).toBe(true);
  });
});
