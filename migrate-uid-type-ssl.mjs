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
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  await client.connect();
  console.log("Connected to database with SSL. Running migration...");
  
  try {
    await client.query('BEGIN');

    // 1. Drop foreign key in admin_permissions
    console.log("Dropping foreign key...");
    await client.query(`
      ALTER TABLE IF EXISTS public.admin_permissions 
      DROP CONSTRAINT IF EXISTS admin_permissions_user_id_fkey;
    `);

    // 2. Change column types to TEXT
    console.log("Changing column types to TEXT...");
    await client.query(`
      ALTER TABLE public.admin_users ALTER COLUMN user_id TYPE TEXT;
      ALTER TABLE public.admin_permissions ALTER COLUMN user_id TYPE TEXT;
    `);

    // 3. Recreate foreign key
    console.log("Recreating foreign key...");
    await client.query(`
      ALTER TABLE public.admin_permissions 
      ADD CONSTRAINT admin_permissions_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES public.admin_users(user_id) ON DELETE CASCADE;
    `);

    await client.query('COMMIT');
    console.log("Migration successful!");
  } catch (e) {
    if (client) await client.query('ROLLBACK');
    console.error("Migration failed:", e);
  } finally {
    await client.end();
  }
}

runMigration();
