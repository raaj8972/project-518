import { expect, it } from 'vitest';
import { fitPdfBranding } from '../src/utils/pdfBrandingLayout';
it('preserves the actual portrait signature and square watermark proportions within their page boxes', () => {
 const stamp = fitPdfBranding({ width: 1414, height: 2000 }, 30, 30); expect(stamp.height).toBe(30); expect(stamp.width).toBeCloseTo(21.21); expect(stamp.width / stamp.height).toBeCloseTo(1414 / 2000);
 const watermark = fitPdfBranding({ width: 500, height: 500 }, 210 * .6, 297 * .6); expect(watermark.width).toBe(watermark.height); expect(watermark.width).toBeLessThanOrEqual(210 * .6);
 expect(() => fitPdfBranding({ width: 0, height: 0 }, 30, 30)).toThrow('invalid dimensions');
});
