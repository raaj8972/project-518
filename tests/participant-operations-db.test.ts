import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, expect, it } from 'vitest';
const db = new PGlite();
const owner = '00000000-0000-0000-0000-000000000001';
const migration = await readFile('supabase/migrations/20261126150000_participant_operations.sql', 'utf8');
beforeAll(async () => {
 await db.exec(`
 CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA storage;
 CREATE FUNCTION admin_can_manage_pages(p text[],f text[]) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'owner'='true' OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb->'pages') x WHERE x=ANY(p))$$;
 CREATE FUNCTION can_manage_storage_bucket(text) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT admin_can_manage_pages(ARRAY['registrations','events','auditions','memberships'],ARRAY[]::text[])$$;
 CREATE TABLE registrations(id text PRIMARY KEY,status text DEFAULT 'pending',is_active boolean DEFAULT false,deleted_at timestamptz);
 CREATE TABLE entry_passes(id uuid DEFAULT gen_random_uuid(),registration_id text,event_registration_id text REFERENCES registrations(id) ON DELETE CASCADE,is_active boolean DEFAULT true);
 CREATE TABLE email_logs(id uuid DEFAULT gen_random_uuid(),created_at timestamptz DEFAULT now(),registration_id text REFERENCES registrations(id),email_type text NOT NULL,recipient_email text NOT NULL,subject text,status text,sent_at timestamptz DEFAULT now(),metadata jsonb);
 CREATE TABLE auditions(id uuid DEFAULT gen_random_uuid(),status text DEFAULT 'pending',full_name text,email text,phone text,instrument_role text,portfolio_link text);
 CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 CREATE TABLE storage.objects(bucket_id text,name text);
 ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;ALTER TABLE auditions ENABLE ROW LEVEL SECURITY;ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 CREATE POLICY legacy_logs ON email_logs FOR ALL TO anon,authenticated USING(true) WITH CHECK(true);
 CREATE POLICY legacy_auditions ON auditions FOR ALL TO anon,authenticated USING(true) WITH CHECK(true);
 CREATE POLICY legacy_storage ON storage.objects FOR ALL TO anon,authenticated USING(true) WITH CHECK(true);
 GRANT USAGE ON SCHEMA public,storage TO anon,authenticated,service_role;GRANT ALL ON ALL TABLES IN SCHEMA public,storage TO anon,authenticated,service_role;
 INSERT INTO registrations VALUES('old','approved',true,NULL);
 INSERT INTO email_logs(registration_id,email_type,recipient_email,status,metadata) VALUES('old','confirmation','fixture@example.test','sent','{"provider":"smtp"}');
 INSERT INTO storage.buckets VALUES('pdf-watermarks','pdf-watermarks',false,NULL,NULL);
 INSERT INTO storage.objects VALUES('pdf-watermarks','watermark.png');
 `);
 await db.exec(migration); await db.exec(migration);
}, 30000);
afterAll(() => db.close());
const rows = async (sql: string) => (await db.query(sql)).rows;
async function as(role = 'postgres', pages: string[] = [], isOwner = false) { await db.exec('RESET ROLE'); await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({ sub: owner, pages, owner: isOwner })]); if (role !== 'postgres') await db.exec(`SET ROLE ${role}`); }
it('backfills legacy logs and accepts both old and new server log payloads without changing existing files', async () => {
 await as(); expect(await rows("select template_type,provider from email_logs where registration_id='old'")).toEqual([{ template_type: 'confirmation', provider: 'smtp' }]);
 await db.exec("insert into email_logs(template_type,recipient_email,status,provider,details) values('rejection','fixture@example.test','failed','resend','{\"subject\":\"Update\"}')");
 expect(await rows("select email_type,subject from email_logs where template_type='rejection'")).toEqual([{ email_type: 'rejection', subject: 'Update' }]);
 expect(await rows('select * from storage.objects')).toEqual([{ bucket_id: 'pdf-watermarks', name: 'watermark.png' }]);
 expect(await rows('select public from storage.buckets')).toEqual([{ public: false }]);
});
it('restricts log reads by assigned page and denies browser log forgery even with legacy allow-all policies', async () => {
 for (const [role, pages] of [['anon', []], ['authenticated', ['gallery']]] as [string, string[]][]) { await as(role, pages); expect(await rows('select * from email_logs')).toHaveLength(0); await expect(db.exec("insert into email_logs(email_type,recipient_email)values('confirmation','forged@example.test')")).rejects.toThrow(/row-level security/); }
 await as('authenticated', ['registrations']); expect((await rows('select * from email_logs')).length).toBeGreaterThan(0); expect(await rows("update email_logs set status='sent' returning id")).toHaveLength(0);
});
it('allows only pending public auditions and only assigned audition staff can review or delete', async () => {
 await as('anon'); await db.exec("insert into auditions(full_name,email,phone,instrument_role)values('Fixture applicant','applicant@example.test','9999900000','Guitar')");
 await expect(db.exec("insert into auditions(full_name,email,phone,instrument_role,status)values('Forged','a@example.test','9999900000','Guitar','contacted')")).rejects.toThrow(/row-level security/);
 await as('authenticated', ['gallery']); expect(await rows("update auditions set status='reviewed' returning id")).toHaveLength(0); expect(await rows('delete from auditions returning id')).toHaveLength(0);
 await as('authenticated', ['auditions']); expect(await rows("update auditions set status='reviewed' returning status")).toEqual([{ status: 'reviewed' }]);
});
it('updates both legacy and current linked passes atomically, keeps inactive entries inactive on restore, and preserves delivery logs on delete', async () => {
 await as(); await db.exec("insert into registrations values('pending','pending',false,NULL);insert into entry_passes(registration_id,is_active)values('pending',false);insert into entry_passes(event_registration_id,is_active)values('pending',false)");
 await db.exec("update registrations set status='approved',is_active=true where id='pending'"); expect(await rows("select is_active from entry_passes where registration_id='pending' or event_registration_id='pending'")).toEqual([{ is_active: true }, { is_active: true }]);
 await db.exec("update registrations set deleted_at=now() where id='pending'"); expect(await rows('select is_active from entry_passes')).toEqual([{ is_active: false }, { is_active: false }]);
 await db.exec("update registrations set status='rejected',is_active=false,deleted_at=NULL where id='pending'"); expect(await rows('select is_active from entry_passes')).toEqual([{ is_active: false }, { is_active: false }]);
 await db.exec("delete from registrations where id='pending';delete from registrations where id='old'"); expect(await rows('select * from entry_passes')).toHaveLength(0); expect(await rows("select registration_id from email_logs where template_type='confirmation'")).toEqual([{ registration_id: null }]);
});
it('allows canonical branding replacement for assigned staff and blocks arbitrary paths and unrelated accounts', async () => {
 await as('authenticated', ['gallery']); await expect(db.exec("insert into storage.objects values('pdf-watermarks','stamp.png')")).rejects.toThrow(/row-level security/);
 await as('authenticated', ['auditions']); await db.exec("insert into storage.objects values('pdf-watermarks','stamp.png')"); await expect(db.exec("insert into storage.objects values('pdf-watermarks','unrelated.png')")).rejects.toThrow(/row-level security/);
 expect(await rows("update storage.objects set name='email_stamp.png' where name='stamp.png' returning name")).toEqual([{ name: 'email_stamp.png' }]); expect(await rows("delete from storage.objects where name='email_stamp.png' returning name")).toHaveLength(1);
});
