import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, expect, it } from 'vitest';

const db = new PGlite();
beforeAll(async () => {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA storage;
    CREATE TABLE public.homepage_settings(id bigint PRIMARY KEY,brand_year integer,hero_title text,sponsor_logos jsonb,featured_partners_enabled boolean,updated_at text);
    INSERT INTO public.homepage_settings VALUES(1,2026,'Festival','[]',true,'original');
    CREATE TABLE public.contact_sections(id bigint PRIMARY KEY,content text);
    CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    CREATE TABLE storage.objects(id bigint PRIMARY KEY,bucket_id text,name text);
    CREATE FUNCTION public.admin_can_manage_pages(pages text[],flags text[]) RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT current_setting('test.pages',true)='owner' OR coalesce(string_to_array(current_setting('test.pages',true),',') && pages,false)
    $$;
    GRANT USAGE ON SCHEMA public,storage TO anon,authenticated;
    GRANT ALL ON public.homepage_settings,public.contact_sections,storage.objects TO anon,authenticated;
    ALTER TABLE public.homepage_settings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.contact_sections ENABLE ROW LEVEL SECURITY;
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE POLICY baseline_home_read ON public.homepage_settings FOR SELECT USING(true);
    CREATE POLICY baseline_home_update ON public.homepage_settings FOR UPDATE TO authenticated USING(true) WITH CHECK(true);
    CREATE POLICY baseline_contact_access ON public.contact_sections FOR ALL TO authenticated USING(true) WITH CHECK(true);
    CREATE POLICY baseline_contact_read ON public.contact_sections FOR SELECT USING(true);
    CREATE POLICY baseline_storage_access ON storage.objects FOR ALL TO anon,authenticated USING(true) WITH CHECK(true);
  `);
  const migration = await readFile(new URL('../supabase/migrations/20261119000000_sponsor_page_connections.sql', import.meta.url), 'utf8');
  await db.exec(migration); await db.exec(migration);
}, 15000);
afterAll(async () => { await db.close(); });
async function role<T>(name: 'anon' | 'authenticated', pages: string, action: () => Promise<T>): Promise<T> {
  await db.query("SELECT set_config('test.pages',$1,false)", [pages]);
  await db.exec(`SET ROLE ${name}`);
  try { return await action(); } finally { await db.exec('RESET ROLE'); }
}

it('allows Sponsors admins to edit placement fields while rejecting unrelated brand changes', async () => {
  await role('authenticated', 'sponsors', async () => {
    await db.exec(`UPDATE public.homepage_settings SET sponsor_logos='[{"id":"one"}]',featured_partners_enabled=false WHERE id=1`);
    await expect(db.exec('UPDATE public.homepage_settings SET brand_year=2027 WHERE id=1')).rejects.toThrow(/row.level security/i);
    await expect(db.exec("UPDATE public.homepage_settings SET hero_title='Changed' WHERE id=1")).rejects.toThrow(/row.level security/i);
  });
  expect((await db.query('SELECT brand_year,featured_partners_enabled FROM public.homepage_settings')).rows[0]).toMatchObject({ brand_year: 2026, featured_partners_enabled: false });
  await role('authenticated', 'homepage', async () => { await db.exec('UPDATE public.homepage_settings SET brand_year=2027 WHERE id=1'); });
});

it('connects office contacts to Sponsors permissions and refuses another page admin', async () => {
  await role('authenticated', 'sponsors', async () => { await db.exec("INSERT INTO public.contact_sections VALUES(1,'team@festival.example')"); });
  await role('authenticated', 'events', async () => { await expect(db.exec("INSERT INTO public.contact_sections VALUES(2,'unauthorized')")).rejects.toThrow(/row.level security/i); });
  await role('anon', '', async () => { expect((await db.query('SELECT * FROM public.contact_sections')).rows).toHaveLength(1); });
});

it('enforces PDF upload limits and prevents anonymous or unrelated-admin brochure writes', async () => {
  expect((await db.query("SELECT public,file_size_limit,allowed_mime_types FROM storage.buckets WHERE id='sponsor-brochures'")).rows[0]).toMatchObject({ public: true, file_size_limit: 10485760, allowed_mime_types: ['application/pdf'] });
  await role('authenticated', 'sponsors', async () => { await db.exec("INSERT INTO storage.objects VALUES(1,'sponsor-brochures','brochures/2026/guide.pdf')"); });
  await role('anon', '', async () => { await expect(db.exec("INSERT INTO storage.objects VALUES(2,'sponsor-brochures','untrusted.pdf')")).rejects.toThrow(/row.level security/i); });
  await role('authenticated', 'events', async () => { await expect(db.exec("INSERT INTO storage.objects VALUES(3,'sponsor-brochures','untrusted.pdf')")).rejects.toThrow(/row.level security/i); });
  await role('anon', '', async () => { expect((await db.query("SELECT * FROM storage.objects WHERE bucket_id='sponsor-brochures'")).rows).toHaveLength(1); });
});

it('leaves unrelated bucket policies unchanged and does not expose the column guard to anonymous callers', async () => {
  await role('anon', '', async () => { await db.exec("INSERT INTO storage.objects VALUES(4,'unrelated-fixture','existing-policy.txt')"); });
  expect((await db.query("SELECT has_function_privilege('anon','public.sponsor_homepage_update_allowed(jsonb)','EXECUTE') AS allowed")).rows[0].allowed).toBe(false);
});
