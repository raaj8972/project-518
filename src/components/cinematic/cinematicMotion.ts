export type Quality = 'high' | 'low' | 'fallback';
export type Point3 = [number, number, number];
export const clamp01 = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
export const smoothRange = (start: number, end: number, value: number) => {
  const t = clamp01((value - start) / Math.max(.00001, end - start));
  return t * t * (3 - 2 * t);
};
export const normalizedProgress = (scrollY: number, start: number, distance: number) => clamp01((scrollY - start) / Math.max(1, distance));
export function getQualityProfile({ memory, cores, width, saveData, reducedMotion, webgl }: {
  memory?: number; cores?: number; width: number; saveData?: boolean; reducedMotion?: boolean; webgl?: boolean;
}): Quality {
  if (reducedMotion || saveData || webgl === false || (memory !== undefined && memory <= 2) || (cores !== undefined && cores <= 2)) return 'fallback';
  return width < 900 || (memory !== undefined && memory <= 4) || (cores !== undefined && cores <= 4) ? 'low' : 'high';
}

const times = [0, .15, .35, .55, .64, .75, .88, 1];
const positions: Point3[] = [[2.3, 3.2, 11.5], [0, 3.2, 5.5], [0, 9, 16], [0, 4.2, -51], [0, 3.8, -61], [0, 4, -69], [0, 4, -79], [0, 4, -85]];
const targets: Point3[] = [[0, 1.7, 3], [0, 2.2, -9], [0, 4, -58], [0, 4, -70], [0, 4, -76], [0, 4, -80], [0, 4, -89], [0, 4, -95]];
/** Cubic Hermite interpolation keeps camera velocity continuous at chapter boundaries. */
function interpolate(points: Point3[], progress: number, knots = times): Point3 {
  let i = 0;
  while (i < knots.length - 2 && progress > knots[i + 1]) i++;
  const span = knots[i + 1] - knots[i];
  const t = clamp01((progress - knots[i]) / span);
  const h00 = 2 * t ** 3 - 3 * t ** 2 + 1, h10 = t ** 3 - 2 * t ** 2 + t;
  const h01 = -2 * t ** 3 + 3 * t ** 2, h11 = t ** 3 - t ** 2;
  return [0, 1, 2].map(axis => {
    const before = Math.max(0, i - 1), after = Math.min(points.length - 1, i + 2);
    const m0 = (points[i + 1][axis] - points[before][axis]) / (knots[i + 1] - knots[before]);
    const m1 = (points[after][axis] - points[i][axis]) / (knots[after] - knots[i]);
    return h00 * points[i][axis] + h10 * span * m0 + h01 * points[i + 1][axis] + h11 * span * m1;
  }) as Point3;
}
/** Follow the existing warden into the hall, then travel through the activated portal. */
export function samplePortalCamera(value: number, aspect: number, lookYaw = 0): { position: Point3; target: Point3; fov: number } {
  const p = clamp01(value), portrait = clamp01((1.2 - aspect) / .75);
  const knots = [0, .3, .6, .76, .88, 1];
  const position = interpolate([[1.2, 2.9, -58.5], [.8, 3, -62], [0, 3.2, -66], [0, 3.8, -70], [0, 4, -76.8], [0, 4, -82]], p, knots);
  const target = interpolate([[0, 2, -65], [0, 2.4, -70], [0, 3.2, -76], [0, 4, -78], [0, 4, -85], [0, 4, -92]], p, knots);
  position[2] += portrait * 1.1 * (1 - smoothRange(.6, .85, p));
  const fov = 48 + portrait * 9;
  const fade = 1 - smoothRange(.6, .82, p);
  if (!Number.isFinite(lookYaw) || Math.abs(lookYaw) < .00001 || fade === 0) return { position, target, fov };
  const yaw = Math.max(-Math.PI, Math.min(Math.PI, lookYaw));
  const entry = clamp01(p / .65), travel = 8 * entry ** 3 * (entry * (entry * 6 - 15) + 10);
  const anchor: Point3 = [-.35, 2.05, -64.3 - travel];
  const dx = position[0] - anchor[0], dz = position[2] - anchor[2], radius = Math.hypot(dx, dz);
  const engagement = smoothRange(0, .3, Math.abs(yaw)) * fade;
  // Stay inside the hall and in front of the portal when viewing the face.
  const safeRadius = Math.min(radius, 3.4, Math.max(1.6, anchor[2] + 75.35));
  const radiusEngagement = smoothRange(0, .3, Math.abs(yaw) * fade);
  const orbitRadius = radius + (safeRadius - radius) * radiusEngagement;
  const angle = Math.atan2(dx, dz) + yaw * fade;
  const orbit: Point3 = [anchor[0] + Math.sin(angle) * orbitRadius, position[1] + (3.05 - position[1]) * engagement, anchor[2] + Math.cos(angle) * orbitRadius];
  return { position: orbit, target: target.map((coordinate, i) => coordinate + (anchor[i] - coordinate) * engagement) as Point3, fov };
}
export function sampleCamera(value: number, aspect: number): { position: Point3; target: Point3; fov: number } {
  const progress = clamp01(value), portrait = clamp01((1.2 - aspect) / .75);
  const position = interpolate(positions, progress), target = interpolate(targets, progress);
  // Pull back for the island's width in portrait; converge on the same entrance and portal.
  position[2] += portrait * 18 * smoothRange(.15, .34, progress) * (1 - smoothRange(.37, .56, progress));
  position[0] *= 1 - portrait * .35;
  position[1] += portrait * .4 * (1 - smoothRange(.4, .55, progress));
  return { position, target, fov: 48 + portrait * 12 };
}
export const chapters = [
  { start: 0, end: .15, number: '00', name: 'The arrival', title: 'A legacy awakens.', description: 'Every world begins with a first step.' },
  { start: .15, end: .35, number: '01', name: 'The floating realm', title: 'Beyond the ordinary.', description: 'One campus. An extraordinary universe.' },
  { start: .35, end: .55, number: '02', name: 'The approach', title: 'All paths lead here.', description: 'IQ City. The heart of Ricorrenza.' },
  { start: .55, end: .75, number: '03', name: 'The threshold', title: 'The gates are opening.', description: 'Step into something unforgettable.' },
  { start: .75, end: 1, number: '04', name: 'Enter Ricorrenza', title: 'Your world awaits.', description: 'RICORRENZA 2026' },
] as const;
