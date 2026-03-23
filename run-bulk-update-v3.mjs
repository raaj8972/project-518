import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runBulkFunctionUpdateV3() {
  await client.connect();
  console.log("Connected to Supabase. Running Bulk Function Update V3...");
  
  try {
    await client.query('BEGIN');

    // 1. Drop functions first to avoid parameter mismatch errors
    console.log("Dropping functions...");
    await client.query(`DROP FUNCTION IF EXISTS public.is_admin();`);
    await client.query(`DROP FUNCTION IF EXISTS public.is_owner();`);
    await client.query(`DROP FUNCTION IF EXISTS public.is_admin_or_owner();`);
    await client.query(`DROP FUNCTION IF EXISTS public.has_permission(text);`);

    // 2. Recreate is_admin
    console.log("Creating is_admin...");
    await client.query(`
      CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE AS $$
        SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text);
      $$;
    `);

    // 3. Recreate is_owner
    console.log("Creating is_owner...");
    await client.query(`
      CREATE OR REPLACE FUNCTION public.is_owner() RETURNS boolean LANGUAGE sql STABLE AS $$
        SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text AND role = 'owner');
      $$;
    `);

    // 4. Recreate is_admin_or_owner
    console.log("Creating is_admin_or_owner...");
    await client.query(`
      CREATE OR REPLACE FUNCTION public.is_admin_or_owner() RETURNS boolean LANGUAGE sql STABLE AS $$
        SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text AND (role = 'owner' OR role = 'admin'));
      $$;
    `);

    // 5. Recreate has_permission
    console.log("Creating has_permission...");
    await client.query(`
      CREATE OR REPLACE FUNCTION public.has_permission(perm_name text) RETURNS boolean LANGUAGE sql STABLE AS $$
        SELECT EXISTS (
          SELECT 1 FROM public.admin_permissions p 
          WHERE p.user_id = auth.uid()::text 
          AND (
            CASE 
              WHEN perm_name = 'can_events' THEN p.can_events
              WHEN perm_name = 'can_sports' THEN p.can_sports
              WHEN perm_name = 'can_registrations' THEN p.can_registrations
              ELSE false
            END
          )
        );
      $$;
    `);

    // 6. Restore site_settings_insert
    console.log("Restoring site_settings_insert policy...");
    await client.query(`DROP POLICY IF EXISTS site_settings_insert ON public.site_settings;`);
    await client.query(`
      CREATE POLICY site_settings_insert ON public.site_settings 
      FOR INSERT WITH CHECK (public.can_edit_site_settings());
    `);

    await client.query('COMMIT');
    console.log("Bulk Function Update V3 Successful!");
  } catch (e) {
    if (client) await client.query('ROLLBACK');
    console.error("Bulk Function Update V3 Failed:", e);
  } finally {
    await client.end();
  }
}

runBulkFunctionUpdateV3();
