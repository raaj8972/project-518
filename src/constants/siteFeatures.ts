// Sports is temporarily hidden across the site at the owner's request.
// Preserve its implementation and database records for later restoration.
export const SITE_FEATURES: { sports: boolean } = { sports: false };

export function isSportsSection(id: string): boolean {
  return /^(sports?(?:$|[-/])|annual(?:$|[-/]))/i.test(id);
}

export function isSportsContent(category: unknown): boolean {
  return typeof category === 'string' && /^(?:annual[ -])?sports?$/i.test(category.trim());
}
