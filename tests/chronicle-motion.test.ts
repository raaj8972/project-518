import { describe, expect, it } from 'vitest';
import { createChronicleCycle, sampleChronicleCycle } from '../src/components/Timeline/chronicleMotion';

const stops = [{ distance: 300, cardIndex: 2 }, { distance: 850, cardIndex: 1 }, { distance: 1400, cardIndex: 0 }];
const cycle = createChronicleCycle(stops, 1900, 1000);

describe('Chronicles energy choreography', () => {
  it('starts dark, visits every card from below and lights the eyes only after arrival', () => {
    expect(sampleChronicleCycle(cycle, 0).eyes).toBe(0);
    const lastTravel = cycle.phases.filter(phase => phase.kind === 'travel').at(-1)!;
    for (let time = 0; time < lastTravel.end; time += .1) expect(sampleChronicleCycle(cycle, time).eyes).toBe(0);
    expect(cycle.phases.filter(phase => phase.kind === 'card').map(phase => phase.cardIndex)).toEqual([2, 1, 0]);
    expect(sampleChronicleCycle(cycle, lastTravel.end + 1).eyes).toBe(1);
  });

  it('physically stays at each card for three seconds while the card charges and fades', () => {
    for (const phase of cycle.phases.filter(item => item.kind === 'card')) {
      const arrival = sampleChronicleCycle(cycle, phase.start + .01);
      const hold = sampleChronicleCycle(cycle, phase.start + 1.6);
      const departure = sampleChronicleCycle(cycle, phase.end - .01);
      expect(phase.end - phase.start).toBeGreaterThanOrEqual(3);
      expect(arrival.distance).toBe(hold.distance);
      expect(departure.distance).toBe(hold.distance);
      expect(hold.charge).toBe(1);
      expect(arrival.charge).toBeLessThan(.01);
      expect(departure.charge).toBeLessThan(.01);
      expect(hold.wand).toBeGreaterThan(.9);
    }
  });

  it('keeps eyes lit for a few seconds, fades to darkness, rests and repeats cleanly', () => {
    const eyes = cycle.phases.find(phase => phase.kind === 'eyes')!;
    expect(sampleChronicleCycle(cycle, eyes.start + 1).eyes).toBe(1);
    expect(sampleChronicleCycle(cycle, eyes.start + 3).eyes).toBe(1);
    expect(sampleChronicleCycle(cycle, eyes.end - .01).eyes).toBeLessThan(.01);
    expect(sampleChronicleCycle(cycle, cycle.duration - 1)).toMatchObject({ phase: 'rest', eyes: 0, wand: 0 });
    expect(sampleChronicleCycle(cycle, cycle.duration)).toEqual(sampleChronicleCycle(cycle, 0));
  });

  it('gives future cards their full dwell time and preserves a slow trip on narrow screens', () => {
    const narrow = createChronicleCycle(stops.map(stop => ({ ...stop, distance: stop.distance * .35 })), 665, 350);
    expect(narrow.phases.filter(phase => phase.kind === 'travel').every(phase => phase.end - phase.start >= 3.6)).toBe(true);
    const extended = createChronicleCycle([...stops, { distance: 1750, cardIndex: 3 }], 2100, 1000);
    expect(extended.duration).toBeGreaterThan(cycle.duration);
    expect(extended.phases.filter(phase => phase.kind === 'card')).toHaveLength(4);
  });
});
