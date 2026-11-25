import type { SponsorshipPackage } from '../types/data';

export function sortSponsorshipPackages(packages: SponsorshipPackage[]): SponsorshipPackage[] {
  return [...(packages || [])].sort((a, b) => Number(a.order_position || 0) - Number(b.order_position || 0) || a.id - b.id);
}

export function sponsorshipPackageAccent(color: string): string {
  const colors: Record<string, string> = { yellow: '#e8c55f', amber: '#e8bc60', orange: '#e4b26e', gray: '#c0d6df', slate: '#c0d6df', silver: '#c0d6df', purple: '#d3a1e5', violet: '#c3a7e8', pink: '#e7acd4', blue: '#a4d3ed', indigo: '#b1c1f1', cyan: '#9de6dd', green: '#b5d995', emerald: '#a4dfb5', red: '#e9b19a' };
  const match = String(color || '').match(/(?:from-|to-)([a-z]+)-\d+/);
  return match ? colors[match[1]] || '#e1c779' : /^#[0-9a-f]{6}$/i.test(color) ? color : '#e1c779';
}

export function packageMovePlan(packages: SponsorshipPackage[], id: number, direction: 'up' | 'down') {
  const sorted = sortSponsorshipPackages(packages);
  const index = sorted.findIndex(pkg => pkg.id === id);
  const target = index + (direction === 'up' ? -1 : 1);
  if (index < 0 || target < 0 || target >= sorted.length) return [];
  const ranks = sorted.map(pkg => pkg.order_position);
  const reordered = [...sorted];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  // Existing distinct ranks need only a two-row swap. Repair ambiguous ranks once.
  const positions = new Set(ranks).size === ranks.length ? ranks : ranks.map((_, i) => (i + 1) * 10);
  return reordered.flatMap((pkg, i) => pkg.order_position === positions[i] ? [] : [{ id: pkg.id, previous: pkg.order_position, next: positions[i] }]);
}
