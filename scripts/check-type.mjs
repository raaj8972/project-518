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

async function checkType() {
  const { data, error } = await supabase
    .from('registrations')
    .select('id')
    .limit(1);
    
  if (error) {
    console.error('Error fetching registration:', error);
  } else {
    console.log('Sample registration ID:', data[0]?.id);
    console.log('Type of ID:', typeof data[0]?.id);
  }
}

checkType();
