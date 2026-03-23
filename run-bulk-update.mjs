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

async function runBulkFunctionUpdate() {
  await client.connect();
  console.log("Connected to Supabase. Running Bulk Function Update...");
  
  try {
    await client.query('BEGIN');

    // 1. Update is_admin
    console.log("Updating is_admin...");
    await client.query(`
      CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE AS $$
        SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text);
      $$;
    `);

    // 2. Update is_owner
    console.log("Updating is_owner...");
    await client.query(`
      CREATE OR REPLACE FUNCTION public.is_owner() RETURNS boolean LANGUAGE sql STABLE AS $$
        SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text AND role = 'owner');
      $$;
    `);

    // 3. Update is_admin_or_owner
    console.log("Updating is_admin_or_owner...");
    await client.query(`
      CREATE OR REPLACE FUNCTION public.is_admin_or_owner() RETURNS boolean LANGUAGE sql STABLE AS $$
        SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text AND (role = 'owner' OR role = 'admin'));
      $$;
    `);

    // 4. Update has_permission
    console.log("Updating has_permission...");
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

    // 5. Restore site_settings_insert
    console.log("Restoring site_settings_insert policy...");
    await client.query(`DROP POLICY IF EXISTS site_settings_insert ON public.site_settings;`);
    await client.query(`
      CREATE POLICY site_settings_insert ON public.site_settings 
      FOR INSERT WITH CHECK (public.can_edit_site_settings());
    `);

    await client.query('COMMIT');
    console.log("Bulk Function Update Successful!");
  } catch (e) {
    if (client) await client.query('ROLLBACK');
    console.error("Bulk Function Update Failed:", e);
  } finally {
    await client.end();
  }
}

runBulkFunctionUpdate();
