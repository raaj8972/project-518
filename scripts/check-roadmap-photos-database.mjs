import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const db=new PGlite();
await db.exec(`
 CREATE ROLE anon; CREATE ROLE authenticated;
 CREATE SCHEMA storage;
 CREATE TABLE public.roadmap_milestones(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,year integer,title text,points text[] DEFAULT '{}');
 CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 CREATE TABLE storage.objects(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,bucket_id text,name text);
 CREATE FUNCTION public.admin_can_manage_pages(text[],text[]) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT coalesce((nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'roadmap')::boolean,false)
 $$;
 GRANT USAGE ON SCHEMA public,storage TO anon,authenticated;
 GRANT ALL ON ALL TABLES IN SCHEMA public,storage TO anon,authenticated;
 GRANT ALL ON ALL SEQUENCES IN SCHEMA public,storage TO anon,authenticated;
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 CREATE POLICY legacy_all ON storage.objects FOR ALL USING(true) WITH CHECK(true);
 INSERT INTO public.roadmap_milestones(year,title,points) VALUES(2015,'Original history',ARRAY['Existing detail']);
 INSERT INTO storage.buckets(id,name,public) VALUES('unrelated','unrelated',true);
`);
const migration=await readFile(new URL('../supabase/migrations/20261115000001_roadmap_photos.sql',import.meta.url),'utf8');
await db.exec(migration);
assert.deepEqual((await db.query('select images from roadmap_milestones')).rows[0].images,[]);
await db.exec("update roadmap_milestones set images=ARRAY['https://example.com/one.jpg','https://example.com/two.jpg']");
await db.exec(migration);
assert.deepEqual((await db.query('select images from roadmap_milestones')).rows[0].images,['https://example.com/one.jpg','https://example.com/two.jpg']);
await db.exec("update roadmap_milestones set images=ARRAY['https://example.com/replaced.jpg']");
assert.deepEqual((await db.query('select title,points,images from roadmap_milestones')).rows[0],{title:'Original history',points:['Existing detail'],images:['https://example.com/replaced.jpg']});
await db.exec("update roadmap_milestones set images='{}'");
assert.deepEqual((await db.query('select images from roadmap_milestones')).rows[0].images,[]);
assert.equal((await db.query("select count(*)::integer count from storage.buckets")).rows[0].count,2);

async function session(role,allowed){await db.exec('RESET ROLE');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({roadmap:allowed})]);await db.exec(`SET ROLE ${role}`);}
await session('anon',false);
await assert.rejects(db.exec("insert into storage.objects(bucket_id,name) values('roadmap-images','visitor.jpg')"),/row-level security/);
await session('authenticated',false);
await assert.rejects(db.exec("insert into storage.objects(bucket_id,name) values('roadmap-images','other-admin.jpg')"),/row-level security/);
await db.exec("insert into storage.objects(bucket_id,name) values('unrelated','unchanged.jpg')");
await session('authenticated',true);
await db.exec("insert into storage.objects(bucket_id,name) values('roadmap-images','timeline.jpg')");
assert.equal((await db.query("update storage.objects set name='replaced.jpg' where bucket_id='roadmap-images' returning name")).rows[0].name,'replaced.jpg');
await session('anon',false);
assert.equal((await db.query("delete from storage.objects where bucket_id='roadmap-images' returning id")).rows.length,0);
await session('authenticated',false);
assert.equal((await db.query("update storage.objects set name='denied.jpg' where bucket_id='roadmap-images' returning id")).rows.length,0);
await session('authenticated',true);
assert.equal((await db.query("delete from storage.objects where bucket_id='roadmap-images' returning id")).rows.length,1);
await db.close();
console.log('Timeline database checks passed: ordered multi-photo persistence, replacement, removal, repeatable migration, existing history preserved and scoped photo permissions.');
