import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { DEFAULT_HOMEBOUND_CONTENT, getHomeboundCategoryOptions, getHomeboundMemberCategory, homeboundCategoryId, readHomeboundContent, safeHomeboundContentUrl } from '../src/utils/homeboundContent';

const musician = (category: string, role = 'Backing vocals', specialty = 'Vocals') => ({ category, role, specialty });

it('uses the existing page defaults for missing settings without sharing mutable arrays', () => {
  const first = readHomeboundContent(null);
  const second = readHomeboundContent({});
  expect(first).toEqual(DEFAULT_HOMEBOUND_CONTENT);
  first.categories[0].aliases.push('Changed locally');
  first.journey_items[0].title = 'Local draft';
  first.sections.hero = false;
  expect(second.categories[0].aliases).not.toContain('Changed locally');
  expect(DEFAULT_HOMEBOUND_CONTENT.journey_items[0].title).toBe('Rehearsals');
  expect(second.sections.hero).toBe(true);
});

it('keeps intentionally cleared copy, removed images and empty lists after reload', () => {
  const saved = readHomeboundContent({ hero_title: '', hero_image: '', hero_wordmark_image: '', hero_wordmark_enabled: false, about_text: '', gallery_url: '', journey_items: [], categories: [], sections: { about: false, band: false, journey: false } });
  expect(saved).toMatchObject({ hero_title: '', hero_image: '', hero_wordmark_image: '', hero_wordmark_enabled: false, about_text: '', gallery_url: '', journey_items: [], categories: [], sections: { hero: true, about: false, band: false, journey: false, encore: true, footer: true } });
  expect(readHomeboundContent(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
});

it('preserves custom category order, stable identifiers, hidden status and legacy aliases', () => {
  const content = readHomeboundContent({ categories: [
    { id: 'beatbox', label: 'Vocal Percussion', aliases: ['Beatboxing', 'Beat Box'], icon: 'beatbox', enabled: false },
    { id: 'vocals', label: 'Singers', aliases: ['Vocals'], icon: 'vocals', enabled: true },
  ] });
  expect(content.categories.map(category => category.id)).toEqual(['beatbox', 'vocals']);
  expect(getHomeboundMemberCategory(musician('Beatboxing'), content.categories)).toBe('beatbox');
  expect(getHomeboundMemberCategory(musician('beatbox'), content.categories)).toBe('beatbox');
  expect(getHomeboundMemberCategory(musician('Singers'), content.categories)).toBe('vocals');
  expect(getHomeboundMemberCategory(musician('Beatboxing'), DEFAULT_HOMEBOUND_CONTENT.categories)).toBe('beatboxing');
  expect(getHomeboundMemberCategory(musician('Instrumentalist', 'Band member', 'Piano'), DEFAULT_HOMEBOUND_CONTENT.categories)).toBe('keys');
  expect(getHomeboundMemberCategory(musician('Guitar'), DEFAULT_HOMEBOUND_CONTENT.categories)).toBe('guitars');
});

it('keeps removed categories selectable for reassignment and never uses the reserved All filter ID', () => {
  const categories = readHomeboundContent({ categories: [{ id: 'all', label: 'All instruments', icon: 'music' }, { id: 'guitars', label: 'Strings', icon: 'guitars', aliases: ['Bass'], enabled: false }] }).categories;
  expect(categories[0].id).toBe('category-all');
  expect(homeboundCategoryId(' Beat Boxing! ')).toBe('beat-boxing');
  expect(getHomeboundCategoryOptions(categories, [musician('Bass'), musician('Beatboxing'), musician('Beatboxing'), musician('Vocals')])).toEqual([
    { value: 'category-all', label: 'All instruments', enabled: true, legacy: false },
    { value: 'guitars', label: 'Strings', enabled: false, legacy: false },
    { value: 'Beatboxing', label: 'Beatboxing', enabled: false, legacy: true },
    { value: 'Vocals', label: 'Vocals', enabled: false, legacy: true },
  ]);
});

it('rejects executable or malformed media while accepting local images and real web links', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,test', 'file:///tmp/image', '/\\example.com/image', '/bad\u0000image', 'https://name:password@example.com']) expect(safeHomeboundContentUrl(value)).toBe('');
  expect(safeHomeboundContentUrl('/images/band portrait.webp')).toBe('/images/band portrait.webp');
  expect(safeHomeboundContentUrl('//example.com/band.webp')).toBe('https://example.com/band.webp');
  expect(safeHomeboundContentUrl('https://example.com/album')).toBe('https://example.com/album');
  expect(readHomeboundContent({ gallery_url: 'javascript:alert(1)', hero_image: 'data:text/html,test' })).toMatchObject({ gallery_url: '', hero_image: '' });
});

it('drops malformed list entries and duplicate identifiers while preserving valid journey removals and text', () => {
  const content = readHomeboundContent({ hero_title: 12, categories: [null, { id: 'vocals', label: 'Vocals', aliases: [12, ' Singer ', 'Singer'], icon: 'invalid' }, { id: 'vocals', label: 'Duplicate' }], journey_items: [null, { id: 'one', title: '', subtitle: 'Custom era', image: '/journey.webp', enabled: false }, { id: 'one', title: 'Duplicate' }], sections: { hero: 'false' } });
  expect(content.hero_title).toBe('Homebound');
  expect(content.categories).toEqual([{ id: 'vocals', label: 'Vocals', aliases: ['Singer'], icon: 'music', enabled: true }]);
  expect(content.journey_items).toEqual([{ id: 'one', title: '', subtitle: 'Custom era', image: '/journey.webp', image_alt: '', enabled: false }]);
  expect(content.sections.hero).toBe(true);
});

const db = new PGlite();
let migration: string;
beforeAll(async () => {
  const baseline = await readFile(new URL('../supabase/migrations/20260326000000_baseline.sql', import.meta.url), 'utf8');
  for (const name of ['homebound_settings', 'band_members']) {
    const schema = baseline.match(new RegExp(`CREATE TABLE IF NOT EXISTS "public"\\."${name}" \\([\\s\\S]*?\\n\\);`));
    if (!schema) throw new Error(`${name} schema not found`);
    await db.exec(schema[0]);
  }
  await db.exec('ALTER TABLE homebound_settings ENABLE ROW LEVEL SECURITY; CREATE POLICY test_homebound_policy ON homebound_settings FOR SELECT USING(true);');
  migration = await readFile(new URL('../supabase/migrations/20261125010000_homebound_page_content.sql', import.meta.url), 'utf8');
  await db.exec(migration);
});
afterAll(async () => db.close());

it('persists custom copy, images, categories and deletions without overwriting Instagram settings', async () => {
  const content = readHomeboundContent({ about_text: 'Our own story.', hero_image: 'https://example.com/stage.webp', categories: [{ id: 'beatbox', label: 'Beatboxing', icon: 'beatbox', enabled: true, aliases: [] }], journey_items: [] });
  await db.query('INSERT INTO homebound_settings(id, instagram_url, page_content) VALUES(1,$1,$2)', ['https://instagram.com/homebound/', JSON.stringify(content)]);
  const saved = await db.query<{ page_content: unknown; instagram_url: string }>('SELECT page_content, instagram_url FROM homebound_settings WHERE id=1');
  expect(readHomeboundContent(saved.rows[0].page_content)).toEqual(content);
  expect(saved.rows[0].instagram_url).toBe('https://instagram.com/homebound/');
  await db.query('UPDATE homebound_settings SET page_content=$1 WHERE id=1', [JSON.stringify({ ...content, categories: [], sections: { ...content.sections, hero: false } })]);
  const updated = await db.query<{ page_content: unknown }>('SELECT page_content FROM homebound_settings WHERE id=1');
  expect(readHomeboundContent(updated.rows[0].page_content)).toMatchObject({ categories: [], journey_items: [], sections: { hero: false } });
});

it('keeps row security and existing policies, permits arbitrary category text, and applies idempotently', async () => {
  await db.exec(migration);
  const policy = await db.query('SELECT policyname FROM pg_policies WHERE schemaname=\'public\' AND tablename=\'homebound_settings\'');
  expect(policy.rows).toEqual([{ policyname: 'test_homebound_policy' }]);
  const security = await db.query<{ relrowsecurity: boolean }>("SELECT relrowsecurity FROM pg_class WHERE oid='public.homebound_settings'::regclass");
  expect(security.rows[0].relrowsecurity).toBe(true);
  await db.exec("INSERT INTO band_members(id,name,role,image,description,specialty,category)VALUES(1,'Test performer','Vocal percussion','/photo.webp','Test biography','Beatboxing','beatbox');");
  const category = await db.query<{ category: string }>('SELECT category FROM band_members WHERE id=1');
  expect(category.rows[0].category).toBe('beatbox');
});

it('rejects arrays, null and scalar content at the database boundary', async () => {
  for (const content of ['[]', 'null', '"copy"']) await expect(db.query('UPDATE homebound_settings SET page_content=$1 WHERE id=1', [content])).rejects.toThrow();
});
