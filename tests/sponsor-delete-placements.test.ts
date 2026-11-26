import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
it('deletes linked and matching legacy placements atomically while keeping frozen archive copies', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;
      CREATE TABLE sponsors(id integer PRIMARY KEY,name text,logo text);
      CREATE TABLE homepage_settings(id integer PRIMARY KEY,sponsor_logos jsonb);
      INSERT INTO sponsors VALUES(14,'Returning Partner','logo.png');
      INSERT INTO homepage_settings VALUES(1,'[
        {"id":"linked","sponsor_id":14,"name":"Partner"},
        {"id":"legacy","name":"Returning Partner","logo_url":"logo.png"},
        {"id":"frozen","archived_sponsor_id":14,"name":"Returning Partner","logo_url":"logo.png","edition_year":2025},
        {"id":"other","sponsor_id":15,"name":"Other Partner"}
      ]');`);
    const migration = await readFile(new URL('../supabase/migrations/20261126141000_sponsor_delete_placements.sql',import.meta.url),'utf8');
    await db.exec(migration); await db.exec(migration);
    await db.exec('BEGIN;DELETE FROM sponsors WHERE id=14;');
    const remaining = (await db.query<{sponsor_logos:Array<{id:string}>}>('SELECT sponsor_logos FROM homepage_settings WHERE id=1')).rows[0].sponsor_logos;
    expect(remaining.map(record=>record.id)).toEqual(['frozen','other']);
    await db.exec('ROLLBACK;');
    expect((await db.query('SELECT * FROM sponsors')).rows).toHaveLength(1);
    expect((await db.query<{sponsor_logos:unknown[]}>('SELECT sponsor_logos FROM homepage_settings')).rows[0].sponsor_logos).toHaveLength(4);
  } finally { await db.close(); }
},15000);
