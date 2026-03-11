import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error('SUPABASE_DB_URL not found in .env');
  process.exit(1);
}

const client = new pg.Client({ connectionString });

async function runMigration() {
  try {
    await client.connect();
    console.log('Connected to database.');

    const sqlPath = path.resolve(__dirname, '../supabase/fix_sports_registrations_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing migration...');
    const result = await client.query(sql);
    console.log('Migration executed successfully:', result);

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

runMigration();
