export const SITE_THEMES = ['spiderman', 'cyberpunk', 'bollywood', 'vaporwave'] as const;
export type SiteTheme = typeof SITE_THEMES[number];
export function isSiteTheme(value: unknown): value is SiteTheme {
  return typeof value === 'string' && SITE_THEMES.includes(value as SiteTheme);
}
export function resolveSiteTheme(options: Record<string, unknown> | null | undefined): SiteTheme {
  // The green-and-gold festival is the default for unversioned installations.
  // Explicit selections made in the updated theme picker remain persistent.
  if (options?.active_theme === 'spiderman') return 'spiderman';
  return options?.theme_version === 2 && isSiteTheme(options.active_theme) ? options.active_theme : 'spiderman';
}
