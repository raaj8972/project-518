import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigrationsRest() {
  console.log('Attempting to apply migrations via REST API (using potential custom RPC)...');

  const sqlFiles = [
    'fix_sports_registrations_schema.sql',
    'add_dual_registration_fields.sql',
    'add_photo_url_to_sports_registrations.sql'
  ];

  for (const file of sqlFiles) {
    const sqlPath = resolve(__dirname, '../supabase', file);
    if (!fs.existsSync(sqlPath)) {
      console.warn(`File not found: ${file}`);
      continue;
    }

    const sqlStr = fs.readFileSync(sqlPath, 'utf8');
    
    try {
      // Trying common RPC names developers use for executing raw SQL via REST
      const rpcs = ['exec_sql', 'execute_sql', 'run_sql'];
      let success = false;
      
      for (const rpc of rpcs) {
        const { data, error } = await supabase.rpc(rpc, { sql: sqlStr });
        // Error 42883 means function does not exist
        if (!error) {
          console.log(`✅ Successfully applied ${file} using RPC '${rpc}'`);
          success = true;
          break;
        } else if (error.code !== '42883') {
           console.log(`⚠️ Execution error for ${file} on ${rpc}:`, error.message);
        }
      }
      
      if (!success) {
         console.error(`❌ Could not run ${file}. No raw SQL execution RPC found via REST.`);
         console.error(`\nBecause your Supabase migration history is broken (which is why 'supabase db push' fails), and you don't have the database password configured in .env for direct access, the ONLY way to fix this is to copy the SQL and paste it directly into the Supabase Dashboard SQL Editor.`);
         process.exit(1);
      }
    } catch (e) {
      console.error(`Error executing ${file}:`, e);
    }
  }
}

applyMigrationsRest();
