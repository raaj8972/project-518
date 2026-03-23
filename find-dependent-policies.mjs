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

async function findPolicies() {
  await client.connect();
  try {
    const res = await client.query(`
      SELECT 
          schemaname, 
          tablename, 
          policyname,
          cmd,
          roles,
          qual,
          with_check
      FROM pg_policies
      WHERE (qual LIKE '%user_id%' OR with_check LIKE '%user_id%')
      AND schemaname = 'public';
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } finally {
    await client.end();
  }
}

findPolicies();
