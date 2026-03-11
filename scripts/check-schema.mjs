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

async function checkSchema() {
  const { data, error } = await supabase
    .from('registrations')
    .select('*')
    .limit(0); // Only get columns if possible
    
  if (error) {
    console.error('Error fetching registration schema:', error);
  } else {
    // Attempting to see the column header info
    console.log('Fetched data (should be empty):', data);
  }

  // RPC method to query info schema
  const { data: colData, error: colError } = await supabase.rpc('get_table_columns', { table_name: 'registrations' });
  
  if (colError) {
    console.log('RPC get_table_columns not found, trying query... ');
    // We don't have a direct raw SQL query tool in the client normally.
    // Let's try to just select one and guess if we can't find it.
  } else {
    console.log('Columns:', colData);
  }
}

checkSchema();
