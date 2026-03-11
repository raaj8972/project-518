import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const dbPassword = process.env.SUPABASE_DB_PASSWORD; // User might have this

async function runMigrations() {
  if (!supabaseUrl) {
    console.error('Missing SUPABASE_URL in .env');
    process.exit(1);
  }

  // Extract project ref
  const projectRefMatch = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
  if (!projectRefMatch) {
    console.error('Could not extract project ref from URL:', supabaseUrl);
    process.exit(1);
  }
  const projectRef = projectRefMatch[1];

  let connectionString = process.env.SUPABASE_DB_URL;

  if (!connectionString) {
    console.log('SUPABASE_DB_URL not found. We need the database password to connect via pg.');
    console.log('\nPlease add SUPABASE_DB_PASSWORD=your_db_password to your .env file and run this script again.');
    console.log(`The connection string would be: postgresql://postgres.[project_ref]:[password]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`);
    process.exit(1);
  }

  const client = new pg.Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected to Postgres database.');

    const sqlFiles = [
      'fix_sports_registrations_schema.sql',
      'add_dual_registration_fields.sql',
      'add_photo_url_to_sports_registrations.sql'
    ];

    for (const file of sqlFiles) {
      const sqlPath = path.resolve(__dirname, '../supabase', file);
      if (fs.existsSync(sqlPath)) {
        console.log(`\nExecuting ${file}...`);
        const sql = fs.readFileSync(sqlPath, 'utf8');
        try {
          await client.query(sql);
          console.log(`✅ ${file} applied successfully.`);
        } catch (queryErr) {
          console.error(`❌ Error in ${file}:`, queryErr.message);
          // Don't stop on errors like "column already exists"
        }
      } else {
        console.warn(`⚠️ Warning: ${file} not found.`);
      }
    }

    console.log('\n🎉 All migrations completed.');

  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  } finally {
    await client.end();
  }
}

runMigrations();
