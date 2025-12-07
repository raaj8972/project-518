import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually parse .env because dotenv might not work perfectly with ESM locally without config
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, ''); // Remove quotes
        if (key && val) env[key] = val;
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getUrl() {
  const { data: files, error } = await supabase.storage.from('pdf-watermarks').list();
  if (error) {
    console.error(error);
    return;
  }

  let file = files.find(f => f.name === 'email_stamp.png' || f.name === 'email_stamp.svg');
  if (!file) {
      console.log('NO_SPECIFIC_STAMP');
      file = files.find(f => f.name === 'stamp.png' || f.name === 'stamp.svg');
  }

  if (file) {
    const { data } = await supabase.storage.from('pdf-watermarks').createSignedUrl(file.name, 3600);
    console.log('SIGNED_URL: ' + data.signedUrl);
  } else {
    console.log('NO_STAMP_FOUND');
  }
}

getUrl();
