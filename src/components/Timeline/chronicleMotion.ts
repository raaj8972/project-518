export interface ChroniclePhase {
  kind: 'source' | 'travel' | 'card' | 'eyes' | 'rest';
  start: number;
  end: number;
  from: number;
  to: number;
  cardIndex?: number;
}

/** Distances follow the actual SVG from the bottom of the valley to the mask. */
export function createChronicleCycle(stops: { distance: number; cardIndex: number }[], length: number, width: number) {
  const phases: ChroniclePhase[] = [];
  let time = 0, distance = 0;
  const add = (kind: ChroniclePhase['kind'], duration: number, to = distance, cardIndex?: number) => {
    phases.push({ kind, start: time, end: time + duration, from: distance, to, cardIndex });
    time += duration;
    distance = to;
  };
  add('source', 1.8);
  for (const stop of stops) {
    add('travel', Math.max(3.6, (stop.distance - distance) / Math.max(28, width * .085)), stop.distance);
    add('card', 3.2, stop.distance, stop.cardIndex);
  }
  add('travel', Math.max(4.8, (length - distance) / Math.max(28, width * .085)), length);
  add('eyes', 5.2);
  add('rest', 3.4);
  return { phases, duration: time };
}

const smooth = (value: number) => value * value * (3 - 2 * value);

export function sampleChronicleCycle(cycle: ReturnType<typeof createChronicleCycle>, elapsed: number) {
  const time = elapsed % cycle.duration;
  const phase = cycle.phases.find(item => time < item.end) || cycle.phases[0];
  const local = time - phase.start;
  const progress = local / (phase.end - phase.start);
  return {
    phase: phase.kind,
    distance: phase.from + (phase.to - phase.from) * smooth(progress),
    wand: phase.kind === 'travel' ? 1 : phase.kind === 'card' ? .94 : 0,
    source: phase.kind === 'source' ? Math.sin(progress * Math.PI) * .85 : .04,
    cardIndex: phase.cardIndex ?? -1,
    charge: phase.kind === 'card' ? smooth(Math.min(1, local / .65)) * smooth(Math.min(1, (phase.end - time) / .8)) : 0,
    eyes: phase.kind === 'eyes' ? smooth(Math.min(1, local / .8)) * smooth(Math.min(1, (phase.end - time) / 1.2)) : 0,
  };
}
