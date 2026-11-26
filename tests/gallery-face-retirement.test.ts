import { expect, it } from 'vitest';
import { handler } from '../netlify/functions/index-faces-batch';
import { getAdminSections } from '../src/constants/adminSections';
import { WEBSITE_PAGES, websitePageTools } from '../src/constants/websitePages';
it('retires indexing requests without loading or scanning photos', async () => {
 const result = await handler({ httpMethod: 'POST', body: '{"limit":1}' } as any, {} as any, () => {}) as any;
 expect(result.statusCode).toBe(410); expect(JSON.parse(result.body).error).toContain('removed');
});
it('omits face indexing from owner navigation and gallery tools even with an old saved grant', () => {
 expect(getAdminSections(true).some(section => section.id === ('face-indexing' as string))).toBe(false);
 const gallery = WEBSITE_PAGES.find(page => page.id === 'gallery')!;
 expect(websitePageTools(gallery, new Set(['gallery', 'face-indexing'])).map(tool => tool.label)).toEqual(['Gallery editor']);
});
