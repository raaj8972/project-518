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

async function runFinalMigrationV2() {
  await client.connect();
  console.log("Connected to Supabase. Running Final Dynamic Migration V2...");
  
  try {
    await client.query('BEGIN');

    // 1. Drop ALL policies that reference user_id OR can_edit_site_settings
    console.log("Dropping all relevant policies...");
    await client.query(`
      DO $$ 
      DECLARE
          pol RECORD;
      BEGIN
          FOR pol IN (
              SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public' 
              AND (
                qual LIKE '%user_id%' OR 
                with_check LIKE '%user_id%' OR 
                qual LIKE '%can_edit_site_settings%' OR 
                with_check LIKE '%can_edit_site_settings%' OR
                qual LIKE '%is_admin%' OR
                with_check LIKE '%is_admin%'
              )
          ) LOOP
              EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
          END LOOP;
      END $$;
    `);

    // 2. Drop specific constraints
    console.log("Dropping all user_id dependent constraints...");
    await client.query(`ALTER TABLE public.admin_permissions DROP CONSTRAINT IF EXISTS admin_permissions_user_id_fkey;`);
    await client.query(`ALTER TABLE public.admin_users DROP CONSTRAINT IF EXISTS admin_users_user_id_fkey;`);
    await client.query(`ALTER TABLE public.admin_users DROP CONSTRAINT IF EXISTS admin_users_id_fkey;`);

    // 3. Change column types to TEXT
    console.log("Changing column types to TEXT...");
    await client.query(`ALTER TABLE public.admin_users ALTER COLUMN user_id TYPE TEXT;`);
    await client.query(`ALTER TABLE public.admin_permissions ALTER COLUMN user_id TYPE TEXT;`);

    // 4. Update the can_edit_site_settings function
    console.log("Updating can_edit_site_settings...");
    await client.query(`
      CREATE OR REPLACE FUNCTION public.can_edit_site_settings()
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
        SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text) 
        OR EXISTS (SELECT 1 FROM public.admin_permissions WHERE user_id = auth.uid()::text AND can_sports = true);
      $$;
    `);

    // 5. Restore Critical Policies
    console.log("Restoring critical policies...");
    await client.query(`DROP POLICY IF EXISTS site_settings_update ON public.site_settings;`);
    await client.query(`CREATE POLICY site_settings_update ON public.site_settings FOR UPDATE USING (public.can_edit_site_settings());`);
    
    await client.query(`DROP POLICY IF EXISTS site_settings_select ON public.site_settings;`);
    await client.query(`CREATE POLICY site_settings_select ON public.site_settings FOR SELECT USING (true);`);
    
    await client.query(`DROP POLICY IF EXISTS "Admins can view admins" ON public.admin_users;`);
    await client.query(`CREATE POLICY "Admins can view admins" ON public.admin_users FOR SELECT USING (true);`);
    
    await client.query(`DROP POLICY IF EXISTS "Admins can manage admins" ON public.admin_users;`);
    await client.query(`CREATE POLICY "Admins can manage admins" ON public.admin_users FOR ALL USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()::text AND role = 'owner'));`);

    // 6. Add the sports council user
    console.log("Syncing sports council user to Supabase...");
    const UID = 'q6BLMit9zsQAjCTUhL0DKdXp1kh2';
    const EMAIL = 'sports.council@rico.family';
    
    await client.query(`
      INSERT INTO public.admin_users (user_id, email, role, is_primary)
      VALUES ($1, $2, 'council', false)
      ON CONFLICT (user_id) DO UPDATE SET role = 'council';
    `, [UID, EMAIL]);

    await client.query(`
      INSERT INTO public.admin_permissions (user_id, can_sports, can_registrations, can_schedule)
      VALUES ($1, true, true, true)
      ON CONFLICT (user_id) DO UPDATE SET can_sports = true, can_registrations = true, can_schedule = true;
    `, [UID]);

    await client.query('COMMIT');
    console.log("Final Dynamic Migration V2 Successful!");
  } catch (e) {
    if (client) await client.query('ROLLBACK');
    console.error("Final Dynamic Migration V2 Failed:", e);
  } finally {
    await client.end();
  }
}

runFinalMigrationV2();
