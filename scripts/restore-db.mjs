import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://isfqhascrdzaoebhuohs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY is missing from .env or .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function restoreDatabase() {
  console.log('🚀 Starting database restoration...');
  
  try {
    const sqlPath = path.join(__dirname, '../supabase/restore_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📖 Reading restore_schema.sql...');
    
    // We use a trick: Supabase JS client doesn't have a direct 'query' method for raw SQL
    // so we use an RPC-based workaround if possible, or we run it via the PostgREST extension if enabled.
    // However, the safest way for raw SQL is usually through a dedicated 'sql' RPC function if it exists,
    // or by running separate commands.
    
    // Since we are an agent, we can also instruct the user to paste this into the SQL Editor,
    // but let's try to do it automatically first.
    
    // Most Supabase projects don't have a 'sql' RPC by default for security.
    // Let's check if we can run it.
    
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      if (error.message.includes('function "exec_sql" does not exist')) {
        console.log('⚠️  "exec_sql" RPC not found. This is normal for security.');
        console.log('\n✅ ACTION REQUIRED: Please copy the content of "supabase/restore_schema.sql"');
        console.log('   and paste it into the Supabase SQL Editor here:');
        console.log(`   https://supabase.com/dashboard/project/isfqhascrdzaoebhuohs/sql/new`);
      } else {
        console.error('❌ Error executing SQL:', error.message);
      }
    } else {
      console.log('✅ Database restoration complete!');
    }
    
  } catch (err) {
    console.error('❌ System error:', err.message);
  }
}

restoreDatabase();
