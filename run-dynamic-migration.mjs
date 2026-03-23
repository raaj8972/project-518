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

async function runDynamicMigration() {
  await client.connect();
  console.log("Connected to Supabase. Running Dynamic Migration...");
  
  try {
    await client.query('BEGIN');

    // 1. Drop ALL policies that reference user_id
    console.log("Dropping all user_id dependent policies...");
    await client.query(`
      DO $$ 
      DECLARE
          pol RECORD;
      BEGIN
          FOR pol IN (
              SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public' 
              AND (qual LIKE '%user_id%' OR with_check LIKE '%user_id%')
          ) LOOP
              EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
          END LOOP;
      END $$;
    `);

    // 2. Drop specific constraints
    console.log("Dropping foreign key constraints...");
    await client.query(`ALTER TABLE public.admin_permissions DROP CONSTRAINT IF EXISTS admin_permissions_user_id_fkey;`);

    // 3. Change column types to TEXT
    console.log("Changing column types to TEXT...");
    await client.query(`ALTER TABLE public.admin_users ALTER COLUMN user_id TYPE TEXT;`);
    await client.query(`ALTER TABLE public.admin_permissions ALTER COLUMN user_id TYPE TEXT;`);

    // 4. Re-add foreign key
    console.log("Re-adding foreign key...");
    await client.query(`
      ALTER TABLE public.admin_permissions 
      ADD CONSTRAINT admin_permissions_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES public.admin_users(user_id) ON DELETE CASCADE;
    `);

    // 5. Restore Critical Policies
    console.log("Restoring critical policies...");
    
    // site_settings function & policy
    await client.query(`
      CREATE OR REPLACE FUNCTION public.can_edit_site_settings()
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
        SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text) 
        OR EXISTS (SELECT 1 FROM public.admin_permissions WHERE user_id = auth.uid()::text AND can_sports = true);
      $$;
    `);
    await client.query(`CREATE POLICY site_settings_update ON public.site_settings FOR UPDATE USING (public.can_edit_site_settings());`);
    await client.query(`CREATE POLICY site_settings_select ON public.site_settings FOR SELECT USING (true);`);

    // admin_users self-select
    await client.query(`CREATE POLICY "Admins can view admins" ON admin_users FOR SELECT USING (true);`);

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
    console.log("Dynamic Migration Successful!");
  } catch (e) {
    if (client) await client.query('ROLLBACK');
    console.error("Dynamic Migration Failed:", e);
  } finally {
    await client.end();
  }
}

runDynamicMigration();
