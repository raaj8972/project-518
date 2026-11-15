export const SPIDER_CYCLE_SECONDS = 56;
export const SPIDER_SCARE_EVENT = 'rico:spider-scare';
const route = [[.78, .34], [.22, .51], [.66, .76], [.83, .49], [.28, .30]] as const;
const smooth = (value: number) => value * value * (3 - 2 * value);
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(value, high));

export function spiderPose(seconds: number, width: number, height: number, size: number) {
  const time = ((seconds % SPIDER_CYCLE_SECONDS) + SPIDER_CYCLE_SECONDS) % SPIDER_CYCLE_SECONDS;
  const margin = Math.min(width / 2, size / 2 + 6);
  const point = (x: number, y: number) => ({ x: clamp(x * width, margin, width - margin), y: clamp(y * height, size * .38, height - size * .30) });
  const first = point(...route[0]);
  const last = point(...route[4]);
  if (time < 8) {
    const progress = smooth(time / 8);
    return { x: first.x + Math.sin(time * 1.3) * 9 * progress, y: -size * .35 + (first.y + size * .35) * progress, heading: Math.PI, thread: 1, anchorX: first.x, hanging: 1, phase: 'descending' };
  }
  if (time < 11) return { x: first.x + Math.sin(time * 1.3) * 7, y: first.y + Math.sin(time * 2) * 4, heading: Math.PI + Math.sin(time) * .06, thread: 1, anchorX: first.x, hanging: 1, phase: 'hanging' };
  if (time < 43) {
    const segment = Math.min(3, Math.floor((time - 11) / 8));
    const t = (time - 11 - segment * 8) / 8;
    const from = route[segment]; const to = route[segment + 1];
    const a = point(from[0], from[1]); const b = point(to[0], to[1]);
    const p = smooth(t);
    const bend = Math.sin(t * Math.PI) * Math.min(width, height) * .07 * (segment % 2 ? -1 : 1);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return { x: a.x + dx * p, y: a.y + dy * p + bend, heading: Math.atan2(dx, -dy), thread: Math.max(0, 1 - (time - 11) * 1.6), anchorX: first.x, hanging: Math.max(0, 1 - (time - 11)), phase: 'crawling' };
  }
  if (time < 52) {
    const p = smooth((time - 43) / 9);
    return { x: last.x + Math.sin(time * 1.6) * 5, y: last.y - (last.y + size * .8) * p, heading: Math.PI, thread: Math.min(1, (time - 43) * 2), anchorX: last.x, hanging: 1, phase: 'climbing' };
  }
  return { x: last.x, y: -size, heading: Math.PI, thread: 0, anchorX: last.x, hanging: 1, phase: 'resting' };
}

export type SpiderPose = ReturnType<typeof spiderPose>;
export interface SpiderEscape {
  from: SpiderPose;
  to: SpiderPose;
  duration: number;
  resumeAt: number;
  heading: number;
}

/** Choose a distant crawl waypoint, then rejoin the normal path without teleporting. */
export function createSpiderEscape(from: SpiderPose, touchX: number, touchY: number, width: number, height: number, size: number): SpiderEscape {
  const candidates = route.map((_, index) => {
    const resumeAt = 11 + index * 8;
    return { pose: spiderPose(resumeAt, width, height, size), resumeAt };
  });
  const destination = candidates.reduce((best, candidate) =>
    Math.hypot(candidate.pose.x - touchX, candidate.pose.y - touchY) > Math.hypot(best.pose.x - touchX, best.pose.y - touchY) ? candidate : best);
  const distance = Math.hypot(destination.pose.x - from.x, destination.pose.y - from.y);
  return {
    from, to: destination.pose, resumeAt: destination.resumeAt,
    duration: clamp(distance / (width < 768 ? 600 : 1000), .32, .85),
    heading: Math.atan2(destination.pose.x - from.x, from.y - destination.pose.y),
  };
}

export function spiderEscapePose(escape: SpiderEscape, seconds: number): SpiderPose {
  // Accelerate immediately, then settle gently onto the normal crawl path.
  const t = clamp(seconds / escape.duration, 0, 1);
  const progress = 1 - (1 - t) ** 2;
  return {
    ...escape.to,
    x: escape.from.x + (escape.to.x - escape.from.x) * progress,
    y: escape.from.y + (escape.to.y - escape.from.y) * progress,
    heading: escape.heading, thread: 0, hanging: 0, phase: 'fleeing',
  };
}
