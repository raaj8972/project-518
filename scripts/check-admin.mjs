import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://isfqhascrdzaoebhuohs.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdminTables() {
  console.log('Checking admin_users...');
  const { data: d1, error: e1 } = await supabase.from('admin_users').select('count');
  console.log('admin_users result:', { data: d1, error: e1?.message });

  console.log('Checking admin_permissions...');
  const { data: d2, error: e2 } = await supabase.from('admin_permissions').select('count');
  console.log('admin_permissions result:', { data: d2, error: e2?.message });
}

checkAdminTables();
