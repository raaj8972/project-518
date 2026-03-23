/**
 * Shared utility functions for color processing and extraction.
 */

/**
 * Converts a hex color string to an rgba string with a specified alpha value.
 */
export const hexToRgba = (hex: string, alpha = 0.75): string => {
  try {
    let h = hex.replace('#', '');
    if (h.length === 3) {
      h = h.split('').map((c) => c + c).join('');
    }
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return `rgba(255, 255, 255, ${alpha})`;
  }
};

/**
 * Approximates a "glow intensity" based on a tier name or color.
 */
export const getIntensityFromTier = (tier: string): 'strong' | 'medium' | 'soft' => {
  const t = (tier || '').toLowerCase();
  if (/title/.test(t) || /diamond/.test(t) || /platinum/.test(t)) return 'strong';
  if (/co\s*-?\s*sponsor/.test(t) || /gold/.test(t) || /silver/.test(t)) return 'medium';
  return 'soft';
};
