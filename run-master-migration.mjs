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

async function runMasterMigration() {
  await client.connect();
  console.log("Connected to Supabase. Running Master Migration...");
  
  try {
    await client.query('BEGIN');

    // 1. Drop ALL policies that might depend on admin_users.user_id or admin_permissions.user_id
    console.log("Dropping dependent policies...");
    const policiesToDrop = [
      ['admin_permissions', 'admin_permissions_user_id_fkey', 'CONSTRAINT'],
      ['entry_passes', 'Admin and Security can view all passes v3', 'POLICY'],
      ['entry_passes', 'Security can update pass usage v3', 'POLICY'],
      ['security_settings', 'Admins can update security settings', 'POLICY'],
      ['security_settings', 'Admins can insert security settings', 'POLICY'],
      ['security_settings', 'Admins update security settings', 'POLICY'],
      ['validation_rules', 'Admins manage validation rules', 'POLICY'],
      ['validation_rules', 'Admins manage rules', 'POLICY'],
      ['event_winners', 'Admins can insert winners', 'POLICY'],
      ['event_winners', 'Admins can update winners', 'POLICY'],
      ['event_winners', 'Admins can delete winners', 'POLICY'],
      ['conversations', 'conversations_select', 'POLICY'],
      ['security_logs', 'Admins can view security logs', 'POLICY'],
      ['shoutouts', 'Admin delete shoutout', 'POLICY']
    ];

    for (const [table, name, type] of policiesToDrop) {
      if (type === 'POLICY') {
        await client.query(`DROP POLICY IF EXISTS "${name}" ON public."${table}";`);
      } else {
        await client.query(`ALTER TABLE public."${table}" DROP CONSTRAINT IF EXISTS "${name}";`);
      }
    }

    // 2. Change column types to TEXT
    console.log("Changing column types to TEXT...");
    await client.query(`ALTER TABLE public.admin_users ALTER COLUMN user_id TYPE TEXT;`);
    await client.query(`ALTER TABLE public.admin_permissions ALTER COLUMN user_id TYPE TEXT;`);

    // 3. Re-add foreign key
    console.log("Re-adding foreign key...");
    await client.query(`
      ALTER TABLE public.admin_permissions 
      ADD CONSTRAINT admin_permissions_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES public.admin_users(user_id) ON DELETE CASCADE;
    `);

    // 4. Recreate Policies (Simplified/Corrected for TEXT)
    console.log("Recreating policies...");
    
    // Entry Passes
    await client.query(`CREATE POLICY "Admin and Security can view all passes v3" ON entry_passes FOR SELECT USING ((EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()::text)) OR (EXISTS (SELECT 1 FROM security_users WHERE username = CURRENT_USER AND is_active = true)));`);
    await client.query(`CREATE POLICY "Security can update pass usage v3" ON entry_passes FOR UPDATE USING ((EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()::text)) OR ((EXISTS (SELECT 1 FROM security_users WHERE username = CURRENT_USER AND is_active = true)) AND is_used = false)) WITH CHECK (is_used = true);`);
    
    // Security Settings
    await client.query(`CREATE POLICY "Admins manage security settings" ON security_settings FOR ALL USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()::text));`);
    
    // Event Winners
    await client.query(`CREATE POLICY "Admins manage winners" ON event_winners FOR ALL USING ((EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()::text)) OR (EXISTS (SELECT 1 FROM admin_permissions WHERE user_id = auth.uid()::text AND can_events = true)));`);

    // 5. Update the can_edit_site_settings function to be TEXT safe
    console.log("Updating can_edit_site_settings...");
    await client.query(`
      CREATE OR REPLACE FUNCTION public.can_edit_site_settings()
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
        SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text) 
        OR EXISTS (SELECT 1 FROM public.admin_permissions WHERE user_id = auth.uid()::text AND can_sports = true);
      $$;
    `);

    // 6. FINALLY: Add the council user to Supabase!
    console.log("Adding council user to Supabase...");
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
    console.log("Master Migration Successful!");
  } catch (e) {
    if (client) await client.query('ROLLBACK');
    console.error("Master Migration Failed:", e);
  } finally {
    await client.end();
  }
}

runMasterMigration();
