/** Read-only by default. --apply applies only the Homebound additive migration;
 * --verify runs a page-content edit/removal probe inside a rolled-back transaction.
 * Credentials and saved page contents are never printed. */
import { loadEnv } from 'vite';
import { readFile } from 'node:fs/promises';

const env = loadEnv('production', process.cwd(), '');
const endpoint = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
if (!endpoint || !env.SUPABASE_ACCESS_TOKEN) throw new Error('Configured Supabase project URL and management access are required. No changes were made.');
const project = new URL(endpoint).hostname.split('.')[0];
async function sql(query, readOnly = true) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, read_only: readOnly }), signal: AbortSignal.timeout(30000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`Homebound schema operation failed (${response.status}): ${result.message || 'Database request failed'}`);
  return result;
}
const policyQuery = `SELECT jsonb_agg(jsonb_build_object('name',policyname,'command',cmd,'roles',roles,'mode',permissive,'using',qual,'check',with_check) ORDER BY policyname) AS policies FROM pg_policies WHERE schemaname='public' AND tablename='homebound_settings'`;
const [before] = await sql(policyQuery);
if (process.argv.includes('--apply')) {
  await sql(await readFile(new URL('../supabase/migrations/20261125010000_homebound_page_content.sql', import.meta.url), 'utf8'), false);
}
const [after] = await sql(policyQuery);
const [row] = await sql(`SELECT jsonb_build_object(
 'pageContentColumn',EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='homebound_settings' AND column_name='page_content' AND data_type='jsonb' AND is_nullable='NO'),
 'objectConstraint',EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.homebound_settings'::regclass AND conname='homebound_page_content_object'),
 'settingsRowSecurity',(SELECT relrowsecurity FROM pg_class WHERE oid='public.homebound_settings'::regclass),
 'bandRowSecurity',(SELECT relrowsecurity FROM pg_class WHERE oid='public.band_members'::regclass),
 'customCategoryText',EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='band_members' AND column_name='category' AND data_type='text'),
 'settingsWritePolicy',EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='homebound_settings' AND cmd IN('ALL','INSERT','UPDATE') AND 'authenticated'=ANY(roles)),
 'bandImageBucket',EXISTS(SELECT 1 FROM storage.buckets WHERE id='band-images' AND public),
 'bandAndHomeboundImageScope',EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='can_manage_storage_bucket' AND pg_get_functiondef(p.oid) LIKE '%band-images%' AND pg_get_functiondef(p.oid) LIKE '%can_homebound%' AND pg_get_functiondef(p.oid) LIKE '%''band''%'),
 'storageWriteGuard',EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND cmd IN('ALL','INSERT') AND with_check LIKE '%can_write_storage_object%'),
 'settingsRealtime',EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='homebound_settings')
) AS checks`);
const checks = { ...row.checks, existingSettingsPoliciesPreserved: JSON.stringify(before.policies) === JSON.stringify(after.policies) };
let rolledBackContentCrud;
if (process.argv.includes('--verify')) {
  if (!checks.pageContentColumn) throw new Error('Homebound page_content migration is missing; no content writes were attempted.');
  await sql(`BEGIN; DO $$ DECLARE probe jsonb; BEGIN
    probe='{"hero_title":"Temporary content verification","hero_image":"/images/verification.webp","categories":[{"id":"beatbox","label":"Beatboxing","icon":"beatbox","enabled":true,"aliases":[]}],"journey_items":[],"sections":{"about":false}}'::jsonb;
    INSERT INTO public.homebound_settings(id,page_content)VALUES(1,probe) ON CONFLICT(id) DO UPDATE SET page_content=excluded.page_content;
    IF NOT EXISTS(SELECT 1 FROM public.homebound_settings WHERE id=1 AND page_content=probe) THEN RAISE EXCEPTION 'Homebound content save failed'; END IF;
    UPDATE public.homebound_settings SET page_content=jsonb_set(page_content,'{categories}','[]'::jsonb) WHERE id=1;
    IF NOT EXISTS(SELECT 1 FROM public.homebound_settings WHERE id=1 AND page_content->'categories'='[]'::jsonb AND page_content->'journey_items'='[]'::jsonb AND page_content->'sections'->'about'='false'::jsonb) THEN RAISE EXCEPTION 'Homebound removal verification failed'; END IF;
  END $$; ROLLBACK;`, false);
  rolledBackContentCrud = true;
}
let publicApi;
const publicKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
if (publicKey && checks.pageContentColumn) {
  const response = await fetch(`${endpoint}/rest/v1/homebound_settings?select=id,page_content&limit=1`, {
    headers: { apikey: publicKey, Authorization: `Bearer ${publicKey}` }, signal: AbortSignal.timeout(20000),
  });
  publicApi = response.ok && Array.isArray(await response.json());
}
const report = { checks, rolledBackContentCrud, publicApi, ok: Object.values(checks).every(Boolean) && publicApi !== false };
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
