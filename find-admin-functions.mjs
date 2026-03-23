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

async function findFunctions() {
  await client.connect();
  try {
    const res = await client.query(`
      SELECT p.proname, n.nspname
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE p.prosrc LIKE '%admin_users%' 
      OR p.prosrc LIKE '%admin_permissions%'
      AND n.nspname = 'public';
    `);
    console.log(res.rows);
  } finally {
    await client.end();
  }
}

findFunctions();
