/** Keep portrait signature artwork proportional and inside its reserved page area. */
export function fitPdfBranding(image: { width: number; height: number }, maxWidth: number, maxHeight: number) {
  if (!(image.width > 0) || !(image.height > 0)) throw new Error('The branding image has invalid dimensions.');
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  return { width: image.width * scale, height: image.height * scale };
}
