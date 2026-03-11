import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // BYPASS RLS
);

async function check() {
  const { data, error } = await supabase
    .from('sports_seasons')
    .select('*')
    
  console.log("Seasons in DB:");
  console.dir(data, { depth: null });
  if (error) console.error(error);
}

check();
