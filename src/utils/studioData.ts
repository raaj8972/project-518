/** Runtime boundaries for legacy database rows and browser drafts (neither is type checked). */
export function recordValue(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export function textValue(value: unknown, fallback = ''): string { return typeof value === 'string' ? value : fallback; }
export function finiteValue(value: unknown, fallback: number): number {
  return (typeof value === 'number' || typeof value === 'string' && value.trim() !== '') && Number.isFinite(Number(value)) ? Number(value) : fallback;
}
export function textList(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
/** Only known fields and matching primitive types can override a saved snapshot. */
export function repairDraftShape<T extends object>(value: unknown, baseline: T): T {
  const source = recordValue(value);
  return Object.fromEntries(Object.entries(baseline).map(([key, fallback]) => {
    const candidate = source[key];
    const valid = typeof fallback === 'number' ? typeof candidate === 'number' && Number.isFinite(candidate)
      : Array.isArray(fallback) ? Array.isArray(candidate)
      : candidate !== null && typeof candidate === typeof fallback;
    return [key, valid ? candidate : fallback];
  })) as T;
}
